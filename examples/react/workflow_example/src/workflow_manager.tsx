import React, { useState, useEffect } from 'react';
import DragDropTaskUI from './drag-drop-task-ui';
import Task from './task_definition';

interface WorkflowManagerProps {
    initialTasks: Task[]
  }
  
const WorkflowManager = ({ initialTasks }: WorkflowManagerProps) => {

  // State to track API call status
  const [apiCallStatus, setApiCallStatus] = useState({
    isLoading: false,
    success: false,
    error: null
  });

  // Auto-dismiss status messages after a delay
  useEffect(() => {
    let timer: number | undefined;
    
    if (apiCallStatus.success || apiCallStatus.error) {
      timer = window.setTimeout(() => {
        setApiCallStatus(prevStatus => ({
          ...prevStatus,
          success: false,
          error: null
        }));
      }, 5000); // 5 seconds
    }
    
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [apiCallStatus.success, apiCallStatus.error]);

  // Handler for executing the workflow via API
  const handleExecuteWorkflow = async (tasks: Task[], connections: {from: number, to: number}[]) => {
    // Reset status
    setApiCallStatus({
      isLoading: true,
      success: false,
      error: null
    });

    try {
      // Prepare data for API call
      const workflowData = {
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          position: task.position,
          // Include any other task fields needed by your API
        })),
        connections: connections.map(conn => ({
          fromTaskId: conn.from,
          toTaskId: conn.to
        }))
      };

    //   // Make API call
    //   const response = await fetch('https://your-api-endpoint.com/execute-workflow', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': 'Bearer YOUR_API_TOKEN' // If your API requires auth
    //     },
    //     body: JSON.stringify(workflowData)
    //   });

    //   // Handle response
    //   if (!response.ok) {
    //     throw new Error(`API responded with status: ${response.status}`);
    //   }

    //   const result = await response.json();

        // Make API call
      const response = await fetch('https://your-api-endpoint.com/execute-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_TOKEN' // If your API requires auth
        },
        body: JSON.stringify(workflowData)
      });

      // Handle response
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const result = await response.json();
      
    //   const result = "ok"
      // Update status on success
      setApiCallStatus({
        isLoading: false,
        success: true,
        error: null
      });

      // Optionally handle the result
      console.log('Workflow execution successful:', result);
      
      // You can show a success message to the user
      alert('Workflow executed successfully!');
      
      // You might want to return the result for further processing
      return result;
      
    } catch (error) {
      // Handle errors
      console.error('Workflow execution failed:', error);
      
      setApiCallStatus({
        isLoading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      // Show error to user
      alert(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return null;
    }
  };

  return (
    <div>
      {/* Status indicator */}
      {apiCallStatus.isLoading && (
        <div className="fixed top-4 right-4 bg-blue-100 p-3 rounded shadow z-50 flex items-center">
          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Executing workflow...
        </div>
      )}
      
      {apiCallStatus.success && (
        <div className="fixed top-4 right-4 bg-green-100 p-3 rounded shadow z-50 flex items-center">
          <svg className="h-5 w-5 mr-2 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Workflow executed successfully! <span className="ml-2 text-xs text-gray-500">(disappears in 5s)</span>
        </div>
      )}
      
      {apiCallStatus.error && (
        <div className="fixed top-4 right-4 bg-red-100 p-3 rounded shadow z-50 flex items-center">
          <svg className="h-5 w-5 mr-2 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Error: {apiCallStatus.error} <span className="ml-2 text-xs text-gray-500">(disappears in 5s)</span>
        </div>
      )}
    
      {/* Drag and Drop Task UI with our execute handler */}
      <DragDropTaskUI 
        initialTasks={initialTasks} 
        onExecuteWorkflow={handleExecuteWorkflow} 
      />
    </div>
  );
};


export default WorkflowManager;