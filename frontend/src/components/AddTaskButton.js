import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus } from 'lucide-react';

const AddTaskButton = ({ 
  user, 
  totalTasks, 
  onAddTask, 
  isLoading = false 
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    category: ''
  });

  const isNormalPlanAtLimit = user?.plan === 'normal' && totalTasks >= 5;

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      await onAddTask({
        ...newTask,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null
      });
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '', category: '' });
      setShowDialog(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  if (isNormalPlanAtLimit) {
    return (
      <div className="fixed bottom-8 right-8">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 bg-gray-400 text-white shadow-xl cursor-not-allowed opacity-75 hover:opacity-75 hover:bg-gray-400"
          onClick={() => alert('Upgrade to Premium to add more tasks!')}
          title="Task limit reached - Upgrade to Premium"
          data-testid="add-task-button-disabled"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 group">
      {/* Glow effect background */}
      <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <button
            type="button"
            onClick={() => setShowDialog(true)}
            className="fixed bottom-8 right-8 w-16 h-16 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-lg hover:shadow-green-500/50 transition-all duration-300 hover:scale-110 flex items-center justify-center"
            title="Add a new task"
            data-testid="add-task-button"
            style={{
              backgroundColor: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[500px]" data-testid="add-task-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {user?.plan === 'premium' ? '✨ Add New Task' : `📝 Add Task (${5 - totalTasks} left)`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs uppercase tracking-wider font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title..."
                data-testid="new-task-title-input"
                className="h-11"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs uppercase tracking-wider font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add details about this task..."
                data-testid="new-task-description-input"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-medium">Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(val) => setNewTask({ ...newTask, priority: val })}
                  disabled={isLoading}
                >
                  <SelectTrigger data-testid="new-task-priority-select" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-xs uppercase tracking-wider font-medium">
                  Due Date
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  data-testid="new-task-due-date-input"
                  className="h-11"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs uppercase tracking-wider font-medium">
                Category
              </Label>
              <Input
                id="category"
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                placeholder="e.g., Work, Personal, Shopping"
                data-testid="new-task-category-input"
                className="h-11"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => {
                  setShowDialog(false);
                  setNewTask({ title: '', description: '', priority: 'medium', due_date: '', category: '' });
                }}
                variant="outline"
                className="flex-1 h-11"
                data-testid="cancel-add-task-button"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTask}
                className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                disabled={!newTask.title.trim() || isLoading}
                data-testid="submit-add-task-button"
              >
                {isLoading ? 'Adding...' : 'Add Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddTaskButton;
