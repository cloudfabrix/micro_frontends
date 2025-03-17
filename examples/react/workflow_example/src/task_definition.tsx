
// Define the Task interface
interface Task {
    id: number;
    title: string;
    description: string;
    category: string;

    position?: { x: number; y: number };
    name?: string;
    label?: string;
    main?: string;
    input_document_count?: number;
    parameter_model?: object;
  }

  export default Task;