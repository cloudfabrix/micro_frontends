import React from "react";
import RunPipeline from "./run-pipeline.js";
import {createTheme, ThemeProvider} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import ErrorAlert from "./error-alert.js";

function getMissingVariables(vars) {
    let missing = []
    const required = ["schema", "pipeline", "pipelineVersion", "pipelinePublished"]
    for (let i = 0; i < required.length; i++) {
        if (!(required[i] in vars) || vars[required[i]] === null) {
            missing.push(required[i])
        }
    }
    return missing;
}

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

const App = (params) => {
    let fixed_variables = params["fixed_variables"]

    let schema = fixed_variables["schema"]
    let uiSchema = fixed_variables["uiSchema"]
    let pipeline = fixed_variables["pipeline"]
    let pipelineVersion = fixed_variables["pipelineVersion"]
    let pipelinePublished = fixed_variables["pipelinePublished"]
    let sites = fixed_variables["sites"]
    let runButtonText = fixed_variables["runButtonText"]
    let runButtonColor = fixed_variables["runButtonColor"]
    let showPipeline = fixed_variables["showPipeline"]
    let showJobId = fixed_variables["showJobId"]

    let missing = getMissingVariables(fixed_variables)
    if (missing.length > 0) {
        let errorMessage = ["The following required fixed variables are missing:", <br/>]
        for (let name of missing) {
            errorMessage.push(<pre>{name}</pre>)
        }
        return (
            <React.StrictMode>
                <ThemeProvider theme={darkTheme}>
                    <CssBaseline enableColorScheme/>
                    <ErrorAlert message={errorMessage}/>
                </ThemeProvider>
            </React.StrictMode>
        )
    }

    console.log(`Using pipeline ${pipeline} v${pipelineVersion} (published=${pipelinePublished})`)
    return (
        <React.StrictMode>
            <ThemeProvider theme={darkTheme}>
                <CssBaseline enableColorScheme/>
                <RunPipeline
                    schema={schema}
                    uiSchema={uiSchema}
                    pipeline={pipeline}
                    version={pipelineVersion}
                    draft={!pipelinePublished}
                    sites={sites}
                    runButtonText={runButtonText}
                    runButtonColor={runButtonColor}
                    showPipeline={showPipeline}
                    showJobId={showJobId}
                />
            </ThemeProvider>
        </React.StrictMode>
    )
};

export default App;
