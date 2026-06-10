//! Package release artifacts for all supported browser stores.

use std::fs;
use std::io;
use std::path::Path;
use std::process::Command;

const OUTPUT_DIR: &str = ".output";
const ARTIFACT_PREFIX: &str = "meow-memorizing-";
const ZIP_EXTENSION: &str = "zip";

fn main() {
    if let Err(err) = run() {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
}

fn run() -> io::Result<()> {
    clean_old_zip_artifacts(Path::new(OUTPUT_DIR))?;
    run_command("bun", &["run", "wasm"])?;
    run_command("bunx", &["wxt", "zip", "-b", "chrome"])?;
    run_command("bun", &["run", "src/copy.ts"])?;
    run_command(
        "bunx",
        &["wxt", "zip", "-b", "firefox", "--sources"],
    )?;
    Ok(())
}

fn clean_old_zip_artifacts(
    output_dir: &Path,
) -> io::Result<()> {
    if !output_dir.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(output_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() && is_project_zip(&path) {
            println!(
                ">> removing old artifact {}",
                path.display()
            );
            fs::remove_file(path)?;
        }
    }

    Ok(())
}

fn is_project_zip(path: &Path) -> bool {
    let Some(file_name) =
        path.file_name().and_then(|name| name.to_str())
    else {
        return false;
    };

    let has_zip_extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            extension == ZIP_EXTENSION
        });

    file_name.starts_with(ARTIFACT_PREFIX)
        && has_zip_extension
}

fn run_command(
    program: &str,
    args: &[&str],
) -> io::Result<()> {
    println!(">> running {} {}", program, args.join(" "));
    let status =
        Command::new(program).args(args).status()?;

    if status.success() {
        return Ok(());
    }

    Err(io::Error::new(
        io::ErrorKind::Other,
        format!(
            "command failed: {} {}",
            program,
            args.join(" ")
        ),
    ))
}
