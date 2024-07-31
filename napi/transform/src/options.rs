use napi::{bindgen_prelude::*, ValueType};
use oxc_transformer::{ReactJsxRuntime, ReactOptions, TransformOptions};

#[napi(object, js_name = "TransformOptions")]
#[derive(Debug, Default, Clone)]
pub struct JsTransformOptions {
    #[napi(ts_type = "ReactOptions")]
    pub react: JsReactOptions,
    #[napi(ts_type = "MinifyOptions")]
    pub codegen: JsCodegenOptions
}

impl From<JsTransformOptions> for TransformOptions {
    fn from(options: JsTransformOptions) -> Self {
        Self {
            react: options.react.into(),
            ..Default::default()
        }
    }
}

// =============================================================================

#[napi(object, js_name = "MinifyOptions")]
#[derive(Debug, Clone)]
pub struct JsCodegenOptions {
    #[napi(ts_type = "CompressOption | boolean")]
    pub compress: CompressOption,
    pub source_map: bool
}

impl Default for JsCodegenOptions {
    fn default() -> Self {
        Self {
            compress: Default::default(),
            source_map: true
        }
    }
}

// #[napi]
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub enum CompressOption {
    #[default]
    None,
    Whitespace,
    Fold
}

impl CompressOption {
    pub const fn is_none(self) -> bool {
        matches!(self, Self::None)
    }
    pub const fn is_some(self) -> bool {
        matches!(self, Self::Whitespace | Self::Fold)
    }
}

impl From<bool> for CompressOption {
    fn from(value: bool) -> Self {
        if value {
            Self::Whitespace
        } else {
            Self::None
        }
    }
}
impl TryFrom<i32> for CompressOption {
    type Error = napi::Error;
    fn try_from(value: i32) -> Result<Self> {
        match value {
            0 => Ok(Self::None),
            1 => Ok(Self::Whitespace),
            2 => Ok(Self::Fold),
            n => Err(napi::Error::new(
                napi::Status::InvalidArg,
                format!(
                    "Invalid CompressOption value `{n}`: must be 0, 1, or 2."),
            )),
        }
    }
}

impl TypeName for CompressOption {
    fn type_name() -> &'static str {
        "CompressOption"
    }
    fn value_type() -> napi::ValueType {
        napi::ValueType::Object
    }
}

impl FromNapiValue for CompressOption {
    unsafe fn from_napi_value(env: napi::sys::napi_env, napi_val: napi::sys::napi_value) -> napi::Result<Self> {
        match type_of!(env, napi_val) {
            Ok(ValueType::Undefined | ValueType::Null) => return Ok(Self::None),
            Ok(ValueType::Boolean) => {
                bool::from_napi_value(env, napi_val).map(CompressOption::from)
            }
            Ok(ValueType::Number) => {
                i32::from_napi_value(env, napi_val).and_then(CompressOption::try_from)
            }
            Ok(_) => todo!(),
            Err(e) => Err(e)
        }

    }
}

impl ToNapiValue for CompressOption {
    unsafe fn to_napi_value(env: napi::sys::napi_env, val: Self) -> napi::Result<napi::sys::napi_value> {
        let val = match val {
            CompressOption::None => 0,
            CompressOption::Whitespace => 1,
            CompressOption::Fold => 2,
        };
        napi::bindgen_prelude::ToNapiValue::to_napi_value(env, val)
    }
}

// =============================================================================

#[napi(object, js_name = "ReactOptions")]
#[derive(Debug, Default, Clone)]
pub struct JsReactOptions {
    pub jsx_plugin: bool,

    #[napi(ts_type = "ReactJsxRuntime")]
    pub runtime: JsReactJsxRuntime,
}

impl From<JsReactOptions> for ReactOptions {
    fn from(options: JsReactOptions) -> Self {
        Self {
            runtime: options.runtime.into(),
            jsx_plugin: options.jsx_plugin,
            ..Default::default()
        }
    }
}

#[napi(js_name = "ReactJsxRuntime")]
#[derive(Debug, Default, PartialEq, Eq)]
pub enum JsReactJsxRuntime {
    Classic,
    #[default]
    Automatic,
}
impl From<JsReactJsxRuntime> for ReactJsxRuntime {
    fn from(runtime: JsReactJsxRuntime) -> Self {
        match runtime {
            JsReactJsxRuntime::Classic => ReactJsxRuntime::Classic,
            JsReactJsxRuntime::Automatic => ReactJsxRuntime::Automatic,
        }
    }
}
