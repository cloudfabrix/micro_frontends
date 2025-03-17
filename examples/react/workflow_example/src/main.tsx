import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import default_tasks from './default_tasks.json'
import Task from './task_definition.tsx'


console.log("window data")
const getAllWindowAttributes = () => {
  let attributes = [];
  let obj = window;
  do {
    Object.getOwnPropertyNames(obj).forEach(property => {
      if (!attributes.includes(property)) {
        attributes.push(property);
      }
    });
  } while (obj = Object.getPrototypeOf(obj));
  return attributes;
};

const windowAttributes = getAllWindowAttributes();
console.log(windowAttributes);

// console.log("Loaded tasks:", window.workflowTasks);
let input_tasks: Task[]  = []
document.addEventListener("workflowDataLoaded", (event: CustomEvent) => {
  input_tasks = event.detail;
  console.log("Received workflow tasks in main.js:", input_tasks);

  // let task_list: Task[] = [...default_tasks, ...input_tasks];
  let task_list: Task[] = [...input_tasks];
  console.log("final task list");
  console.log(task_list);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App  task_list={task_list} />
    </StrictMode>,
  );
});

// const params = new URLSearchParams(window.location.search)
// console.log("**Params :", params)
// for (const param of params) {
//   console.log(param);
// }

// if (params.has("fixed_variables")){
//     console.log("Fixed variables found!")
//     const variables = params.get("fixed_variables")
//     console.log("**variables :")
//     console.log(variables)
//     const inputdata = JSON.parse(atob(variables))
//     console.log("**inputdata :")
//     console.log(inputdata)
//     console.log("type of inputdata :")
//     console.log(typeof inputdata)
//     input_tasks = inputdata.task_list
//     console.log("**input tasks :")
//     console.log(input_tasks)

// }

// if(params.has("task_list")){
//     console.log("Task list found!")
//     const tasks = params.get("task_list")
//     input_tasks = JSON.parse(atob(tasks)) as Task[];
//     console.log(input_tasks)
// }else{
//     console.error("Input task list not found!")
// }

// let task_list: Task[] = [...default_tasks, ...input_tasks]
// console.log("final task list")
// console.log(task_list)

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App  task_list={task_list} />
//   </StrictMode>,
// )

