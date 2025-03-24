import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

//import schema from './sample_schema.tsx'

// createRoot(document.getElementById('root')!).render(
//       <StrictMode>
//         <App schema={schema} />
//       </StrictMode>,
//     );
  
const params = new URLSearchParams(window.location.search)
console.log("URL params :", params)
let input_variables = {}
if(params.has("fixed_variables")){
    console.log("Fixed variables found!")
    const variables = params.get("fixed_variables")
    input_variables = JSON.parse(atob(variables))
    console.log(input_variables)
}else{
    console.error("Fixed variables not found!")
}

console.log(input_variables)
const schema = input_variables["schema"]
console.log("Schema :", schema)

createRoot(document.getElementById('root')!).render(
        <StrictMode>
          <App schema={schema} />
        </StrictMode>,
      );