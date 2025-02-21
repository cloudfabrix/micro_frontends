import React from "react";
import {Alert, AlertTitle} from "@mui/material";

export default function ErrorAlert(props) {
    return (
        <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {props["message"]}
        </Alert>
    )

}