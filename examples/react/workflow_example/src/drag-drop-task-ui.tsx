import React, { useState, useRef, useEffect } from 'react';
import Task from './task_definition.tsx'

interface DragDropTaskUIProps {
  initialTasks: Task[];
  onExecuteWorkflow?: (tasks: Task[], connections: {from: number, to: number}[]) => void;
}

const DragDropTaskUI = ({ initialTasks, onExecuteWorkflow }: DragDropTaskUIProps) => {

  console.log("task list in drag drop", initialTasks)
  interface Connection {
    from: number;
    to: number;
  }
  
  const categories = [...new Set(initialTasks.map(task => task.category))];
  console.log("categories :", categories)

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Tasks that have been dropped onto the workspace
  const [workspaceTasks, setWorkspaceTasks] = useState<Task[]>([]);
  
  // Connections between tasks on the workspace
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // For tracking connection creation
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  
  // For tracking task positions in the workspace
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  
  // For tracking the mouse position when connecting
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // For alignment guides
  const [showVerticalGuide, setShowVerticalGuide] = useState(false);
  const [verticalGuidePosition, setVerticalGuidePosition] = useState(0);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);

  // Constants for task dimensions and grid
  const TASK_WIDTH = 300; // Wider task width
  const MIN_TASK_HEIGHT = 60; // Minimum height, actual height will adjust to content
  const GRID_SIZE = 10;    // Grid size for snapping
  const ALIGNMENT_THRESHOLD = 20; // Threshold for snapping to alignment guides
  const VERTICAL_SPACING = 40; // Additional spacing between tasks beyond their height


  // Update mouse position for drawing the connecting line
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isConnecting && workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    if (isConnecting) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isConnecting]);

  // Snap to grid function
  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task, fromWorkspace: boolean = false) =>  {
    e.dataTransfer.setData('taskId', task.id.toString());
    e.dataTransfer.setData('fromWorkspace', fromWorkspace.toString());
    
    if (fromWorkspace) {
      setDraggedTask(task.id);
    }
  };

  // Handle dragging over workspace for alignment guides
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Find potential vertical alignment with other tasks
    if (workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
    
    
      // Find task centers for vertical alignment
      const centerPositions = workspaceTasks
        .filter(t => t.id !== draggedTask)
        .map(t => t.position.x + TASK_WIDTH/2);
      
      // Check if we're close to aligning with any task
      let shouldShowGuide = false;
      let guidePos = 0;
      
      for (const centerX of centerPositions) {
        if (Math.abs(mouseX - centerX) < ALIGNMENT_THRESHOLD) {
          shouldShowGuide = true;
          guidePos = centerX;
          break;
        }
      }
      
      setShowVerticalGuide(shouldShowGuide);
      setVerticalGuidePosition(guidePos);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedTask(null);
    setShowVerticalGuide(false);
  };


  // Handle drop onto the workspace
  const handleWorkspaceDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const fromWorkspace = e.dataTransfer.getData('fromWorkspace') === 'true';
    
    if (workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      let xPos = e.clientX - rect.left - TASK_WIDTH/2;
      const yPos = e.clientY - rect.top - 20;
      
      // Snap to vertical guide if showing
      if (showVerticalGuide) {
        xPos = verticalGuidePosition - TASK_WIDTH/2;
      } else {
        // Otherwise snap to grid
        xPos = snapToGrid(xPos);
      }
      
      // If already in workspace, just update position
      if (fromWorkspace) {
        const updatedTasks = [...workspaceTasks];
        const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1) {
          updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            position: {
              x: xPos,
              y: snapToGrid(yPos)
            }
          };
          setWorkspaceTasks(updatedTasks);
        }
      } 
      // Add new task to workspace
      else if (!workspaceTasks.some(t => t.id === taskId)) {
        const task = initialTasks.find(t => t.id === taskId);
        if (task) {
          const newTask = {
            ...task,
            position: {
              x: xPos,
              y: snapToGrid(yPos)
            }
          };
          setWorkspaceTasks([...workspaceTasks, newTask]);
        }
      }
      
      setShowVerticalGuide(false);
      setDraggedTask(null);
    }
  };

  // Automatically arrange tasks vertically
  const arrangeTasksVertically = (): void => {
    if (workspaceTasks.length === 0) return;
    
    // Find leftmost task as reference or use a fixed starting position
    const sortedByX = [...workspaceTasks].sort((a, b) => a.position.x - b.position.x);
    const referenceX = sortedByX[0].position.x;
    
    // Sort by Y position
    const sortedByY = [...workspaceTasks].sort((a, b) => a.position.y - b.position.y);
    
    // First position all tasks at the same X coordinate
    const initialUpdatedTasks = sortedByY.map((task, index) => ({
      ...task,
      position: {
        x: referenceX,
        y: 50 + (index * (MIN_TASK_HEIGHT + VERTICAL_SPACING))
      }
    }));
    
    // Update the state with the initial position
    setWorkspaceTasks(initialUpdatedTasks);
    
    // Use setTimeout to allow the DOM to update before measuring heights
    setTimeout(() => {
      // Get all task elements to measure their heights
      const taskElements = Array.from(document.querySelectorAll('[data-task-id]'));
      
      if (taskElements.length === 0) return;
      
      // Create an array of tasks with their measured heights
      const tasksWithHeights = initialUpdatedTasks.map(task => {
        const element = taskElements.find(el => 
          parseInt(el.getAttribute('data-task-id') || '0') === task.id
        );
        
        return {
          ...task,
          measuredHeight: element ? element.clientHeight : MIN_TASK_HEIGHT
        };
      });
      
      // Now reposition with proper spacing based on measured heights
      let currentY = 50;
      const finalArrangedTasks = tasksWithHeights.map(task => {
        const newTask = {
          ...task,
          position: {
            x: referenceX,
            y: currentY
          }
        };
        
        // Update Y position for next task
        currentY += task.measuredHeight + VERTICAL_SPACING;
        
        // Remove the temporary measuredHeight property
        delete newTask.measuredHeight;
        
        return newTask;
      });
      
      // Update state with final positions
      setWorkspaceTasks(finalArrangedTasks);
    }, 50);
  };

  // Start connecting tasks
  const startConnection = (taskId: number) => {
    setConnectingFrom(taskId);
    setIsConnecting(true);
    
    // Add event listener for cancel connection on ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        setIsConnecting(false);
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Add event listener for click outside
    const handleClickOutside = () => {
      setConnectingFrom(null);
      setIsConnecting(false);
      window.removeEventListener('click', handleClickOutside);
    };
    
    // Small delay to avoid immediate triggering
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 100);
  };


  // Complete connection
  const completeConnection = (e: React.MouseEvent<HTMLDivElement>, toTaskId: number) => {
    e.stopPropagation(); // Prevent the click from bubbling up
    
    if (connectingFrom && connectingFrom !== toTaskId) {
      // Check if this connection already exists
      const connectionExists = connections.some(
        conn => (conn.from === connectingFrom && conn.to === toTaskId) || 
                (conn.from === toTaskId && conn.to === connectingFrom)
      );
      
      if (!connectionExists) {
        setConnections([...connections, { from: connectingFrom, to: toTaskId }]);
      }
      setConnectingFrom(null);
      setIsConnecting(false);
    }
  };
  

  // Get center point of a task
  const getTaskCenter = (task: Task) => {
    // Try to get actual height from DOM
    const element = document.querySelector(`[data-task-id="${task.id}"]`);
    const taskHeight = element ? element.clientHeight : MIN_TASK_HEIGHT;
    
    return {
      x: task.position.x + TASK_WIDTH/2,
      y: task.position.y + taskHeight/2
    };
  };

  // Calculate connection points and control points for curved lines
  const calculateConnectionPoints = (fromTask: Task, toTask: Task) => {
    // Get DOM elements to calculate actual heights
    const fromElement = document.querySelector(`[data-task-id="${fromTask.id}"]`);
    const toElement = document.querySelector(`[data-task-id="${toTask.id}"]`);
    
    // Default height if element not found
    const fromTaskHeight = fromElement ? fromElement.clientHeight : MIN_TASK_HEIGHT;
    const toTaskHeight = toElement ? toElement.clientHeight : MIN_TASK_HEIGHT;
    
    const fromCenter = {
      x: fromTask.position.x + TASK_WIDTH/2,
      y: fromTask.position.y + fromTaskHeight/2
    };
    
    const toCenter = {
      x: toTask.position.x + TASK_WIDTH/2,
      y: toTask.position.y + toTaskHeight/2
    };
    
    // Calculate direction vector
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const nx = dx / distance;
    const ny = dy / distance;
    
    // Calculate intersection points with task borders
    // This determines where the line should start and end
    
    // For the starting task
    let fromX, fromY;
    
    // For horizontal connections
    if (Math.abs(dx) > Math.abs(dy)) {
      // Connection exits from right or left side
      fromX = fromCenter.x + (nx > 0 ? TASK_WIDTH/2 : -TASK_WIDTH/2);
      fromY = fromCenter.y;
    } else {
      // Connection exits from top or bottom side
      fromX = fromCenter.x;
      fromY = fromCenter.y + (ny > 0 ? fromTaskHeight/2 : -fromTaskHeight/2);
    }
    
    // For the ending task
    let toX, toY;
    
    // For horizontal connections
    if (Math.abs(dx) > Math.abs(dy)) {
      // Connection enters from right or left side
      toX = toCenter.x + (nx < 0 ? TASK_WIDTH/2 : -TASK_WIDTH/2);
      toY = toCenter.y;
    } else {
      // Connection enters from top or bottom side
      toX = toCenter.x;
      toY = toCenter.y + (ny < 0 ? toTaskHeight/2 : -toTaskHeight/2);
    }
    
    return { fromX, fromY, toX, toY };
  };

  // Render connection lines
  const renderConnections = () => {
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="black" />
          </marker>
        </defs>
        
        {/* Vertical alignment guide */}
        {showVerticalGuide && (
          <line 
            x1={verticalGuidePosition} 
            y1="0" 
            x2={verticalGuidePosition} 
            y2="100%" 
            stroke="#3B82F6" 
            strokeWidth="1"
            strokeDasharray="5,5"
          />
        )}
        
        {/* Existing connections */}
        {connections.map((conn, index) => {
          const fromTask = workspaceTasks.find(t => t.id === conn.from);
          const toTask = workspaceTasks.find(t => t.id === conn.to);
          
          if (!fromTask || !toTask) return null;
          
          const { fromX, fromY, toX, toY } = calculateConnectionPoints(fromTask, toTask);
          
          return (
            <line 
              key={index} 
              x1={fromX} 
              y1={fromY} 
              x2={toX} 
              y2={toY} 
              stroke="black" 
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        
        {/* Line being drawn during connection */}
        {isConnecting && connectingFrom && (() => {
          const fromTask = workspaceTasks.find(t => t.id === connectingFrom);
          if (!fromTask) return null;
          
          const fromCenter = getTaskCenter(fromTask);
          
          // Calculate direction vector to mouse
          const dx = mousePosition.x - fromCenter.x;
          const dy = mousePosition.y - fromCenter.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Skip if distance is too small
          if (distance < 1) return null;
          
          // Normalize direction vector
          const nx = dx / distance;
          const ny = dy / distance;
          
          // Calculate exit point
          let fromX, fromY;
          
          // Get the element reference again for safety
          const fromElement = document.querySelector(`[data-task-id="${fromTask.id}"]`);
          const actualTaskHeight = fromElement ? fromElement.clientHeight : MIN_TASK_HEIGHT;
          
          // For horizontal connections
          if (Math.abs(dx) > Math.abs(dy)) {
            // Connection exits from right or left side
            fromX = fromCenter.x + (nx > 0 ? TASK_WIDTH/2 : -TASK_WIDTH/2);
            fromY = fromCenter.y;
          } else {
            // Connection exits from top or bottom side
            fromX = fromCenter.x;
            fromY = fromCenter.y + (ny > 0 ? actualTaskHeight/2 : -actualTaskHeight/2);
          }
          
          return (
            <line 
              x1={fromX} 
              y1={fromY} 
              x2={mousePosition.x} 
              y2={mousePosition.y} 
              stroke="blue" 
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          );
        })()}
      </svg>
    );
  };

  // Remove task from workspace
  const removeFromWorkspace = (e: React.MouseEvent<HTMLButtonElement>, taskId: number) => {
    e.stopPropagation();
    setWorkspaceTasks(workspaceTasks.filter(t => t.id !== taskId));
    
    setConnections(connections.filter(conn => conn.from !== taskId && conn.to !== taskId));
  };

  // Execute workflow
  const executeWorkflow = () => {
    // Extract all workspace tasks and their connections
    if (workspaceTasks.length === 0) {
      alert("No tasks in workspace. Please add tasks to execute workflow.");
      return;
    }

    // Call the onExecuteWorkflow prop with the workspace tasks and connections
    if (onExecuteWorkflow) {
      onExecuteWorkflow(workspaceTasks, connections);
    } else {
      // If no handler is provided, just log the data
      console.log("Executing workflow with tasks:", workspaceTasks);
      console.log("Connections:", connections);
      alert("Workflow execution triggered. Check console for details.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Task list sidebar */}
      <div className="w-64 bg-white p-4 shadow-md overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Task Categories</h2>
        <div className="space-y-2"></div>
        {categories.map(category => (
          <div key={category}  className="mb-2">
            <div
              className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-200 cursor-pointer hover:bg-blue-100"
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
            >
              <span className="font-medium">{category}</span>
            </div>
            {expandedCategory === category && (
              <div className="pl-4">
                {initialTasks.filter(task => task.category === category).map(task => (
                  <div
                    key={task.id}
                    className="bg-blue-50 p-3 rounded border border-blue-200 cursor-move mt-2"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                  >
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-gray-600">{task.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Workspace area */}
      <div 
        ref={workspaceRef}
        className="flex-1 bg-gray-50 p-4 relative overflow-auto"
        onDragOver={handleDragOver}
        onDrop={handleWorkspaceDrop}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Workspace</h2>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded shadow"
              onClick={arrangeTasksVertically}
              disabled={workspaceTasks.length === 0}
            >
              Arrange Vertically
            </button>
            <button
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded shadow"
              onClick={executeWorkflow}
              disabled={workspaceTasks.length === 0}
            >
              Execute Workflow
            </button>
          </div>
        </div>
        <div 
          className="relative border-2 border-dashed border-gray-300 rounded h-full"
          onDragEnd={handleDragEnd}
        >
          {/* Connection hint when connecting */}
          {isConnecting && (
            <div className="fixed top-2 right-2 bg-yellow-100 p-2 rounded shadow z-50">
              Click on another task to connect or press ESC to cancel
            </div>
          )}

          {/* Render connection lines */}
          {renderConnections()}

          {/* Workspace tasks */}
          {workspaceTasks.map(task => (
            <div
              key={task.id}
              data-task-id={task.id}
              className={`absolute p-3 bg-white rounded shadow-md border-2 ${
                connectingFrom === task.id ? 'border-blue-500' : 
                isConnecting ? 'border-gray-400 cursor-pointer' : 'border-gray-200'
              }`}
              style={{
                left: `${task.position.x}px`,
                top: `${task.position.y}px`,
                width: `${TASK_WIDTH}px`,
                minHeight: `${MIN_TASK_HEIGHT}px`,
              }}

              draggable
              onDragStart={(e) => handleDragStart(e, task, true)}
              onClick={(e) => isConnecting && connectingFrom !== task.id ? completeConnection(e, task.id) : null}
            >
              <div className="flex justify-between">
                <div className="flex-1 pr-2">
                  <span className="font-medium block">{task.title}</span>
                  <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                </div>
                <div className="flex flex-col space-y-1">
                  <button
                    className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      startConnection(task.id);
                    }}
                    title="Connect to another task"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                  </button>
                  <button
                    className="text-red-600 hover:bg-red-50 p-1 rounded"
                    onClick={(e) => removeFromWorkspace(e, task.id)}
                    title="Remove task"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DragDropTaskUI;