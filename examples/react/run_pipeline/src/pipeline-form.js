import React, {useState} from "react";
import {JsonForms} from "@jsonforms/react";
import {
    materialCells,
    materialRenderers,
} from '@jsonforms/material-renderers';
import {Box} from "@mui/material";
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import pstreamSelectorTester from "./renderers/pstream-selector-tester.js";
import pstreamSelector from "./renderers/pstream-selector.js";

const renderers = [
    ...materialRenderers,
    {tester: pstreamSelectorTester, renderer: pstreamSelector}
]

export default function PipelineForm(props) {
    const [data, setData] = useState({});

    let schema = props["schema"]
    let uiSchema = props["uischema"]
    let updater = props["updater"]

    if(uiSchema != null){
        console.log("UI Schema found!")
        console.log(uiSchema)
    }

    const ajv = new Ajv({
        allErrors: true,
        verbose: true,
        strict: false,
    });
    addFormats(ajv)
    let validate = ajv.compile(schema)

    function onDataChanged(newData){
        setData(newData)
        let valid = validate(newData)
        updater(newData, valid)
    }

    return (
        <Box maxHeight={"60vh"} overflow="auto" paddingTop={"10px"}>
            <JsonForms schema={schema} uischema={uiSchema == null ? undefined : uiSchema} data={data} renderers={renderers} cells={materialCells} ajv={ajv} onChange={({data}) => onDataChanged(data)}/>
        </Box>
    )
}