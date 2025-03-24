import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Dynamic Form Component that renders a form based on an external schema
 * 
 * @param {Object} props - Component props
 * @param {Object} props.schema - The form schema defining fields and behavior
 * @param {Object} props.initialValues - Initial values for the form fields
 * @param {Function} props.onSubmit - Function called when form is submitted with form values
 * @param {Function} props.onChange - Optional callback when form values change
 * @param {Boolean} props.showDebugInfo - Whether to show debug information
 * @param {String} props.className - Class name for the outer container
 * @param {String} props.formClassName - Class name for the form element
 * @param {String} props.buttonClassName - Class name for the submit button
 */
const DynamicForm = ({
  schema,
  initialValues = {},
  onSubmit,
  onChange,
  showDebugInfo = false,
  className = '',
  formClassName = '',
  buttonClassName = ''
}) => {
  // Form state
  const [formValues, setFormValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [visibleFields, setVisibleFields] = useState([]);

  // Reset form when schema or initialValues change
  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues, schema]);

  // Determine visible fields based on current values and dependencies
  useEffect(() => {
    if (!schema || !schema.fields) return;

    const determineVisibleFields = () => {
      const visible = schema.fields.filter(field => {
        // If field has a custom visibility function
        if (field.show && typeof field.show === 'function') {
          try {
            return field.show(formValues);
          } catch (e) {
            console.error(`Error in show function for field ${field.id}:`, e);
            return false;
          }
        }

        // If field has dependsOn condition
        if (field.dependsOn) {
          const { field: dependsOnField, values, notEmpty, parentConditions } = field.dependsOn;

          // Check parent conditions if any
          if (parentConditions) {
            const parentsValid = parentConditions.every(condition => {
              if (condition.values) {
                return condition.values.includes(formValues[condition.field]);
              }
              if (condition.notEmpty) {
                return Boolean(formValues[condition.field]);
              }
              return true;
            });
            
            if (!parentsValid) return false;
          }

          // Check direct dependency
          if (values) {
            return values.includes(formValues[dependsOnField]);
          }
          if (notEmpty) {
            return Boolean(formValues[dependsOnField]);
          }
        }

        // If no dependencies, field is always visible
        return true;
      });

      setVisibleFields(visible.map(field => field.id));
    };

    determineVisibleFields();
  }, [formValues, schema]);

  // Get options for a select field
  const getFieldOptions = (field) => {
    // If field has a function to get dynamic options
    if (field.getDynamicOptions && typeof field.getDynamicOptions === 'function') {
      try {
        return field.getDynamicOptions(formValues);
      } catch (e) {
        console.error(`Error in getDynamicOptions for field ${field.id}:`, e);
        return [];
      }
    }

    // If field has dynamicOptions with dependsOn structure
    if (field.dynamicOptions && field.dynamicOptions.dependsOn) {
      const { dependsOn, options } = field.dynamicOptions;
      const dependentValue = formValues[dependsOn];
      
      if (!dependentValue) return [];
      
      return options[dependentValue] || [];
    }

    // Default to static options
    return field.options || [];
  };

  // Handle field value changes
  const handleChange = (fieldId, value) => {
    // Update form values
    const updatedValues = { ...formValues, [fieldId]: value };
    
    // Clear errors for this field
    if (errors[fieldId]) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
    
    // Get field definition
    const field = schema.fields.find(f => f.id === fieldId);
    
    // Reset dependent fields if specified
    if (field && field.resetFields && field.resetFields.length > 0) {
      const resetValues = { ...updatedValues };
      field.resetFields.forEach(resetFieldId => {
        resetValues[resetFieldId] = '';
      });
      setFormValues(resetValues);
    } else {
      setFormValues(updatedValues);
    }
    
    // Call onChange callback if provided
    if (onChange) {
      onChange(updatedValues);
    }
  };

  // Validate form
  const validateForm = () => {
    if (!schema || !schema.fields) return true;
    
    const newErrors = {};
    let isValid = true;
    
    // Validate visible required fields
    visibleFields.forEach(fieldId => {
      const field = schema.fields.find(f => f.id === fieldId);
      if (!field) return;
      
      // Skip validation for non-required checkboxes
      if (field.type === 'checkbox' && !field.required) return;
      
      // Check required fields
      if (field.required) {
        const value = formValues[fieldId];
        const isEmpty = value === undefined || value === null || value === '';
        
        if (isEmpty) {
          newErrors[fieldId] = `${field.label} is required`;
          isValid = false;
        }
      }
      
      // Email validation
      if (field.validation === 'email' && formValues[fieldId]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formValues[fieldId])) {
          newErrors[fieldId] = 'Please enter a valid email address';
          isValid = false;
        }
      }
      
      // Code validation
      if (field.validateCode && field.type === 'codeEditor' && formValues[fieldId]) {
        const code = formValues[fieldId];
        if (!code.includes('def ')) {
          newErrors[fieldId] = 'Code must include at least one function definition';
          isValid = false;
        }
      }
    });
    
    // Check validation rules from schema
    if (schema.validationRules) {
      schema.validationRules.forEach(rule => {
        // Skip this rule if condition doesn't match
        if (rule.when && rule.when.field) {
          const fieldValue = formValues[rule.when.field];
          if (!rule.when.values.includes(fieldValue)) return;
        }
        
        // Check required fields for this rule
        rule.require.forEach(fieldId => {
          const field = schema.fields.find(f => f.id === fieldId);
          if (!field || !visibleFields.includes(fieldId)) return;
          
          const value = formValues[fieldId];
          const isEmpty = value === undefined || value === null || value === '';
          
          if (isEmpty) {
            newErrors[fieldId] = `${field.label} is required`;
            isValid = false;
          }
        });
      });
    }
    
    setErrors(newErrors);
    return isValid;
  };

  // Check if form is valid
  const isFormValid = () => {
    if (!schema || !schema.fields) return false;
    
    // If the form has validation rules
    if (schema.validationRules && schema.validationRules.length > 0) {
      // Find applicable rules based on current values
      const applicableRules = schema.validationRules.filter(rule => {
        if (!rule.when || !rule.when.field) return true;
        return rule.when.values.includes(formValues[rule.when.field]);
      });
      
      if (applicableRules.length === 0) return false;
      
      // Check all applicable rules
      return applicableRules.every(rule => {
        return rule.require.every(fieldId => {
          const value = formValues[fieldId];
          return value !== undefined && value !== null && value !== '';
        });
      });
    }
    
    // Default: check if all required visible fields have values
    return visibleFields.every(fieldId => {
      const field = schema.fields.find(f => f.id === fieldId);
      if (!field) return true;
      
      if (!field.required) return true;
      if (field.type === 'checkbox') return true;
      
      const value = formValues[fieldId];
      return value !== undefined && value !== null && value !== '';
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setSubmitting(true);
      
      try {
        // Only include values for visible fields
        const submissionValues = {};
        visibleFields.forEach(fieldId => {
          submissionValues[fieldId] = formValues[fieldId];
        });
        
        // Call onSubmit callback with form values
        await onSubmit(submissionValues);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Render form field based on its type
  const renderField = (field) => {
    if (!visibleFields.includes(field.id)) return null;
    
    // Different field renderers based on type
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={field.id}
              type={field.type}
              value={formValues[field.id] || ''}
              onChange={(e) => handleChange(field.id, field.type === 'number' ? e.target.valueAsNumber || '' : e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              required={field.required}
              disabled={field.disabled}
            />
            
            {errors[field.id] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.id]}</p>
            )}
            
            {field.helpText && !errors[field.id] && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );
        
      case 'select':
        const options = getFieldOptions(field);
        
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={field.id}
              value={formValues[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={field.required}
              disabled={field.disabled}
            >
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {errors[field.id] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.id]}</p>
            )}
            
            {field.helpText && !errors[field.id] && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );
        
      case 'textarea':
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={field.id}
              value={formValues[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={field.rows || 4}
              placeholder={field.placeholder}
              required={field.required}
              disabled={field.disabled}
            />
            
            {errors[field.id] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.id]}</p>
            )}
            
            {field.helpText && !errors[field.id] && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={field.id} className="mb-4">
            <div className="flex items-center">
              <input
                id={field.id}
                type="checkbox"
                checked={formValues[field.id] || false}
                onChange={(e) => handleChange(field.id, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={field.disabled}
              />
              <label htmlFor={field.id} className="ml-2 block text-sm text-gray-900">
                {field.checkboxLabel || field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
            
            {errors[field.id] && (
              <p className="mt-1 text-sm text-red-600 ml-6">{errors[field.id]}</p>
            )}
            
            {field.helpText && !errors[field.id] && (
              <p className="mt-1 text-xs text-gray-500 ml-6">{field.helpText}</p>
            )}
          </div>
        );
        
      case 'codeEditor':
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 text-xs font-mono flex justify-between items-center border-b border-gray-300">
                <span>Python</span>
                <span className="text-gray-500">Code Editor</span>
              </div>
              <textarea
                id={field.id}
                value={formValues[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                className="w-full p-3 font-mono text-sm bg-gray-50 focus:outline-none"
                rows={field.rows || 10}
                placeholder={field.placeholder}
                required={field.required}
                disabled={field.disabled}
              />
            </div>
            
            {errors[field.id] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.id]}</p>
            )}
            
            {field.helpText && !errors[field.id] && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );
        
      default:
        console.warn(`Unknown field type: ${field.type} for field ${field.id}`);
        return null;
    }
  };

  // Show message if no schema provided
  if (!schema || !schema.fields) {
    return <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">No form schema provided</div>;
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className={formClassName}>
        {/* Form fields */}
        {schema.fields.map(field => renderField(field))}
        
        {/* Submit button */}
        {schema.buttonText && (
          <button
            type="submit"
            disabled={submitting || !isFormValid()}
            className={buttonClassName || `w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
              submitting || !isFormValid() 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {submitting ? 'Submitting...' : schema.buttonText}
          </button>
        )}
        
        {/* Debug information */}
        {showDebugInfo && (
          <div className="mt-8 p-4 border border-gray-300 rounded-md bg-gray-50 text-xs">
            <details>
              <summary className="font-semibold cursor-pointer">Debug Information</summary>
              <div className="mt-2 font-mono overflow-auto">
                <div className="mb-2">
                  <strong>Form Values:</strong>
                  <pre>{JSON.stringify(formValues, null, 2)}</pre>
                </div>
                <div className="mb-2">
                  <strong>Visible Fields:</strong>
                  <pre>{JSON.stringify(visibleFields, null, 2)}</pre>
                </div>
                <div className="mb-2">
                  <strong>Form Valid:</strong>
                  <pre>{JSON.stringify(isFormValid(), null, 2)}</pre>
                </div>
                <div>
                  <strong>Errors:</strong>
                  <pre>{JSON.stringify(errors, null, 2)}</pre>
                </div>
              </div>
            </details>
          </div>
        )}
      </form>
    </div>
  );
};

// PropTypes for component
DynamicForm.propTypes = {
  schema: PropTypes.shape({
    fields: PropTypes.arrayOf(PropTypes.object).isRequired,
    buttonText: PropTypes.string,
    validationRules: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onChange: PropTypes.func,
  showDebugInfo: PropTypes.bool,
  className: PropTypes.string,
  formClassName: PropTypes.string,
  buttonClassName: PropTypes.string
};

export default DynamicForm;