#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

mod options;

use std::path::Path;

use napi::{Error, Status};
use oxc_allocator::Allocator;
use oxc_codegen::{CodeGenerator, CodegenOptions, CodegenReturn};
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
use oxc_sourcemap::SourceMap as OxcSourceMap;
use oxc_span::SourceType;
use oxc_transformer::Transformer;

use itertools::Itertools;

use options::*;

/// should match
/// [`EncodedSourceMap`](https://github.com/jridgewell/trace-mapping/blob/5a658b10d9b6dea9c614ff545ca9c4df895fee9e/src/types.ts#L14)
/// from `@jridgewell/trace-mapping`, since this is what Jest expects.
/// ```ts
/// export interface SourceMapV3 {
///   file?: string | null;
///   names: string[];
///   sourceRoot?: string;
///   sources: (string | null)[];
///   sourcesContent?: (string | null)[];
///   version: 3;
///   ignoreList?: number[];
/// }
///
/// export interface EncodedSourceMap extends SourceMapV3 {
///   mappings: string;
/// }
/// ```
#[napi(object)]
#[derive(Debug, Clone)]
pub struct SourceMap {
    pub file: Option<String>,
    pub names: Vec<String>,
    pub source_root: Option<String>,
    #[napi(ts_type = "(string | null)[]")]
    pub sources: Vec<Option<String>>,
    #[napi(ts_type = "(string | null)[]")]
    pub sources_content: Option<Vec<Option<String>>>,
    pub version: u32,
    pub ignore_list: Option<Vec<u32>>,
    pub mappings: String,
}

impl TryFrom<OxcSourceMap> for SourceMap {
    type Error = napi::Error;
    fn try_from(sourcemap: OxcSourceMap) -> Result<Self, Self::Error> {
        let mappings = sourcemap.to_json_string();
        // TODO: do not clone once fields are exposed from oxc_sourcemap
        Ok(Self {
            file: sourcemap.get_file().map(ToString::to_string),
            names: sourcemap.get_names().map(Into::into).collect(),
            source_root: sourcemap.get_source_root().map(ToString::to_string),
            sources: sourcemap.get_sources().map(|s| Some(s.into())).collect(),
            sources_content: sourcemap
                .get_source_contents()
                .map(|sources_content| sources_content.map(|s| Some(s.into())).collect()),
            version: 3,
            ignore_list: None, // TODO: not exposed,
            mappings,
        })
    }
}

#[derive(Debug, Clone)]
#[napi(object)]
pub struct TransformResult {
    pub source_text: String,
    pub source_map: Option<SourceMap>,
}
#[napi]
pub fn transform(
    filename: String,
    source_text: String,
    // TODO
    options: Option<JsTransformOptions>,
) -> Result<TransformResult, Error> {
    let options = options.unwrap_or_default();
    let source_type =
        SourceType::from_path(&filename).map_err(|err| Error::new(Status::InvalidArg, err))?;
    let allocator = Allocator::default();
    let parser_ret = Parser::new(&allocator, &source_text, source_type).parse();

    let errors = parser_ret.errors;
    let mut program = parser_ret.program;

    if !errors.is_empty() {
        let errors = errors
            .into_iter()
            // use Display::fmt for pretty printing
            .map(|error| format!("{error}"))
            .join("\n\n");
        let message = format!("Failed to parse {filename}:\n\n{errors}");
        return Err(Error::new(Status::GenericFailure, message));
    }

    let (symbols, scopes) = SemanticBuilder::new()
        .build(&program)
        .semantic
        .into_symbol_table_and_scope_tree();
    let path = Path::new(&filename);
    let transform_options = options.clone().into();
    let ret = Transformer::new(&allocator, path, transform_options).build_with_symbols_and_scopes(
        symbols,
        scopes,
        &mut program,
    );

    if !ret.errors.is_empty() {
        return Err(Error::from_reason(format!("{}", ret.errors[0])));
    }

    // TODO: source maps before transforming
    let CodegenReturn { code, map } = CodeGenerator::new()
        .with_options(CodegenOptions {
            source_map_path: Some(path.to_path_buf()),
            ..CodegenOptions::default()
        })
        .build(&program);

    let _source_map = map.map(SourceMap::try_from).transpose()?;
    Ok(TransformResult {
        source_text: code,
        // source_map: source_map.map(SourceMap::from),
        source_map: None,
    })
}

#[napi]
pub async fn transform_async(
    filename: String,
    source_text: String,
    // TODO
    options: Option<JsTransformOptions>,
) -> Result<TransformResult, Error> {
    tokio::spawn(async move { transform(filename, source_text, options) })
        .await
        .map_err(|e| Error::from_reason(e.to_string()))?
}
