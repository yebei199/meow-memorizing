{
  description = "meow-memorizing 开发 shell —— 固定 wasm-bindgen-cli 版本，使其与 Cargo 锁定的 wasm-bindgen crate (=0.2.122) 完全一致";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      # 只有宿主机 arch 是当下真正需要的；多列几个平台，方便其他机器上的
      # 贡献者也能拿到同一个 shell。刻意不引 flake-utils，用 nixpkgs.lib 即可。
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # rust/bun/node/clang/mold 都由宿主机 profile 提供；宿主机唯一缺（版本对不上）
      # 的一环是 wasm-bindgen-cli——它必须与 `=0.2.122` 的 wasm-bindgen crate 完全
      # 一致，否则 CLI 直接拒绝生成胶水代码。详见 scripts/build-wasm.sh。
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          nativeBuildInputs = [ pkgs.wasm-bindgen-cli_0_2_122 ];
        };
      });
    };
}
