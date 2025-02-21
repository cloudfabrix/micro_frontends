import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import default_variables from "./default_variables.json"

const domNode = document.getElementById('root');
const root = createRoot(domNode);

const params = new URLSearchParams(window.location.search)
let input_variables = {}
if(params.has("fixed_variables")){
    console.log("Fixed variables found!")
    const variables = params.get("fixed_variables")
    input_variables = JSON.parse(atob(variables))
    console.log(input_variables)
}else{
    console.error("Fixed variables not found!")
}

let variables = {...default_variables, ...input_variables}
console.log(variables)

root.render(<App fixed_variables={variables}/>);
