import {
    Category,
    Component,
    Palette,
    Variant,
} from "@react-buddy/ide-toolbox"
import AntdPalette from "@react-buddy/palette-antd";
import {Fragment} from "react"

export const PaletteTree = () => (
    <Palette>
        <Category name="App">
            <Component name="Loader">
                <Variant>
                    <ExampleLoaderComponent/>
                </Variant>
            </Component>
        </Category>
        <AntdPalette/>
    </Palette>
)

export function ExampleLoaderComponent() {
    return (
        // biome-ignore lint/complexity/noUselessFragments: <explanation>
<Fragment>Loading...</Fragment>
    )
}