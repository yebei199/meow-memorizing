import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './style.css'
import {DevSupport} from "@react-buddy/ide-toolbox";
import {ComponentPreviews, useInitial} from "@/src/dev";

const root = document.getElementById('root')
if (root) {
    ReactDOM.createRoot(root).render(<DevSupport ComponentPreviews={ComponentPreviews}
                                                 useInitialHook={useInitial}
    >
        <App/>
    </DevSupport>)
}
