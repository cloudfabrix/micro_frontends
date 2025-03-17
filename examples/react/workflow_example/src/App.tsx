import Task from './task_definition.tsx';
import './App.css';
import WorkflowManager from './workflow_manager.tsx';

interface AppProps {
  task_list: Task[];
}

const App  = ({ task_list }: AppProps) => {
  console.log("task list in App", task_list)
  return (
    <>
       <WorkflowManager 
             initialTasks={task_list}
        />
     </>
  )
}

export default App;


