import React, {useEffect, useState} from "react";
import {withJsonFormsControlProps, withTranslateProps} from '@jsonforms/react';
import {CircularProgress, InputAdornment, TextField} from "@mui/material";
import {MaterialInputControl, MuiSelect} from "@jsonforms/material-renderers";
import jqjs from "@sscots/jqjs"

const PStreamSelectorControl = (props) => {
    const [selectionOptions, setSelectionOptions] = useState(null);

    const {uischema} = props;

    let options = uischema["options"]
    let {apiUrl, labelField, valueField, jq} = options;

    let usingJq = jq !== undefined

    if (!usingJq && labelField === undefined) {
        labelField = valueField
    }

    useEffect(() => {
        fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then(response => response.json())
            .then(data => {
                let enumOptions = []
                let pstreamData = data["pstream_data"]
                if (usingJq) {
                    let jqFilter = jqjs.compile(jq)
                    for(let row of pstreamData){
                        for(let v of jqFilter(row)){
                            enumOptions.push({
                                label: v.toString(),
                                value: v
                            })
                        }
                    }
                } else {
                    enumOptions = pstreamData.map((item) => ({
                        label: item[labelField],
                        value: item[valueField],
                    }));
                }
                setSelectionOptions(enumOptions)
            });
    }, [])

    if (selectionOptions === null) {
        return (
            <MaterialInputControl
                {...props}
                id="outlined-basic"
                variant="outlined"
                disabled
                input={TextField}
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <CircularProgress size="20px"/>
                            </InputAdornment>
                        ),
                    },
                }}
            />
        )
    } else {
        return <MaterialInputControl {...props} options={selectionOptions} input={MuiSelect}/>
    }
};

export default withJsonFormsControlProps(
    withTranslateProps(React.memo(PStreamSelectorControl)),
    false
);