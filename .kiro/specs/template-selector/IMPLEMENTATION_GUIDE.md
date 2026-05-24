# TemplateSelector Implementation Guide

## Overview

This guide provides step-by-step instructions for integrating the TemplateSelector component into the ExamGen-IA application.

## Files Created

### 1. Design Document
- **Path:** `.kiro/specs/template-selector/design.md`
- **Purpose:** Complete design specification with architecture, data models, correctness properties, and testing strategy
- **Key Sections:**
  - Component hierarchy and state management
  - Data models (Template, HeaderInfo)
  - 6 correctness properties for property-based testing
  - Error handling and accessibility considerations
  - Performance and responsive design guidelines

### 2. CSS Stylesheet
- **Path:** `frontend/src/styles/TemplateSelector.css`
- **Size:** ~600 lines
- **Features:**
  - Complete styling matching ExamBank design system
  - Navy blue (#0e2b50) and gold (#d4a843) color palette
  - Responsive grid layout (3 columns desktop, 2 tablet, 1 mobile)
  - Modal, form, pagination, and loading state styles
  - Smooth animations and transitions
  - Accessibility-compliant color contrast

### 3. React Component
- **Path:** `frontend/src/enseignant/ai-generator/TemplateSelector.jsx`
- **Size:** ~500 lines
- **Features:**
  - Main TemplateSelector component with full state management
  - TemplateCard sub-component for individual template display
  - TemplateSelectionModal for header information form
  - Pagination component for template list navigation
  - Filter logic with search, type, subject, and level filters
  - Form validation with error messages
  - Mock data for development/testing

## Integration Steps

### Step 1: Create Directory Structure

```bash
mkdir -p frontend/src/enseignant/ai-generator
mkdir -p .kiro/specs/template-selector
```

### Step 2: Copy Files

The three files have already been created:
- `design.md` - Design specification
- `TemplateSelector.css` - Stylesheet
- `TemplateSelector.jsx` - React component

### Step 3: Update AIGenerator Component

Modify `frontend/src/enseignant/questions/AIGenerator.jsx` to integrate TemplateSelector:

```javascript
// Add import at top
import TemplateSelector from '../ai-generator/TemplateSelector';

// In the component, add a state to track if template is selected
const [selectedTemplate, setSelectedTemplate] = useState(null);
const [headerInfo, setHeaderInfo] = useState(null);

// Check if coming from TemplateSelector
useEffect(() => {
  const state = location.state;
  if (state?.selectedTemplate && state?.headerInfo) {
    setSelectedTemplate(state.selectedTemplate);
    setHeaderInfo(state.headerInfo);
    // Pre-populate context with header info
    setContext({
      matiere: state.headerInfo.matiere,
      niveau: state.headerInfo.niveau,
      duree: state.headerInfo.duree,
      noteTotale: state.headerInfo.noteTotale
    });
  }
}, [location.state]);

// Conditionally render TemplateSelector or AIGenerator
if (!selectedTemplate) {
  return <TemplateSelector />;
}

// Otherwise render existing AIGenerator UI
return (
  // ... existing AIGenerator JSX
);
```

### Step 4: Update API Integration

Replace mock data in TemplateSelector with actual API calls:

```javascript
// In TemplateSelector.jsx, update fetchTemplates()
const fetchTemplates = async () => {
  try {
    setLoading(true);
    setError('');
    const response = await fetch('/api/enseignant/templates');
    if (!response.ok) throw new Error('Failed to fetch templates');
    const data = await response.json();
    setTemplates(data);
  } catch (err) {
    setError('Impossible de charger les modèles. Veuillez réessayer.');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

### Step 5: Update Routing

Add route in your router configuration:

```javascript
// In your router setup
{
  path: '/enseignant/ai-generator',
  element: <AIGenerator />
}
```

### Step 6: Update Sidebar Navigation

Add menu item to enseignant sidebar:

```javascript
// In sidebarConfigs.js
{
  icon: FiCpu,
  label: 'Générateur d\'Examen',
  href: '/enseignant/ai-generator'
}
```

## API Endpoints Required

### 1. Get Templates
```
GET /api/enseignant/templates
Response: Template[]
```

**Expected Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "nom": "Modèle Examen Final",
    "type": "final",
    "matiere": "Informatique",
    "discipline": "Informatique",
    "duree": "2h",
    "semestre": "2ème année",
    "titreExamen": "EXAMEN FINAL",
    "departementFr": "Département Informatique",
    "universiteFr": "Université Nord-Américaine",
    "institutFr": "Institut International",
    "enseignants": "Dr. Ahmed Ben Ali",
    "actif": true,
    "examCount": 5,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### 2. Delete Template (Optional)
```
DELETE /api/enseignant/templates/:id
Response: { success: boolean, message: string }
```

## Component Props and State

### TemplateSelector Props
```typescript
interface TemplateSelectorProps {
  onTemplateSelect?: (template: Template, headerInfo: HeaderInfo) => void;
  onCancel?: () => void;
}
```

### State Structure
```javascript
{
  templates: [],              // All templates from API
  filteredTemplates: [],      // After applying filters
  currentPage: 1,             // Pagination
  itemsPerPage: 9,
  
  searchQuery: '',            // Search filter
  filterType: '',             // Type filter
  filterSubject: '',          // Subject filter
  filterLevel: '',            // Level filter
  
  selectedTemplate: null,     // Selected for generation
  showModal: false,           // Modal visibility
  
  loading: false,
  error: '',
  toast: { message: '', type: 'success' }
}
```

## Customization Options

### 1. Change Items Per Page
```javascript
const PER_PAGE = 9; // Change to desired number
```

### 2. Modify Template Types
```javascript
const TEMPLATE_TYPES = {
  final: 'Examen Final',
  cc: 'Contrôle Continu',
  rattrapage: 'Examen Rattrapage'
  // Add more types as needed
};
```

### 3. Add More Filters
Add new filter state and update filteredTemplates logic:
```javascript
const [filterDepartment, setFilterDepartment] = useState('');

// In filteredTemplates useMemo
const matchesDepartment = !filterDepartment || 
  norm(template.departementFr) === norm(filterDepartment);
```

### 4. Customize Colors
Update CSS variables in TemplateSelector.css:
```css
:root {
  --ts-navy: #0e2b50;        /* Primary color */
  --ts-gold: #d4a843;        /* Accent color */
  /* ... other variables */
}
```

## Testing

### Unit Tests
Create `TemplateSelector.test.jsx`:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateSelector from './TemplateSelector';

describe('TemplateSelector', () => {
  test('renders header with title', () => {
    render(<TemplateSelector />);
    expect(screen.getByText(/Choisissez un modèle/i)).toBeInTheDocument();
  });

  test('filters templates by search query', () => {
    // Test implementation
  });

  test('validates form before submission', () => {
    // Test implementation
  });
});
```

### Property-Based Tests
Use fast-check or Hypothesis for property testing:
```javascript
import fc from 'fast-check';

describe('TemplateSelector Properties', () => {
  test('Property 1: Filtering preserves validity', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          nom: fc.string(),
          type: fc.constantFrom('final', 'cc', 'rattrapage'),
          matiere: fc.string()
        })),
        (templates) => {
          // Test that all filtered results match criteria
        }
      )
    );
  });
});
```

## Performance Optimization

### 1. Memoization
Already implemented with `useMemo` for:
- `filteredTemplates` - Recalculates only when filters change
- `paginatedTemplates` - Recalculates only when page changes
- `uniqueSubjects` and `uniqueLevels` - Recalculates only when templates change

### 2. Lazy Loading
For large template lists, implement virtual scrolling:
```javascript
import { FixedSizeList } from 'react-window';

// Wrap cards grid with virtual list
```

### 3. Debouncing
Search input already uses onChange directly. For optimization:
```javascript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useCallback(
  debounce((value) => setSearchQuery(value), 300),
  []
);
```

## Troubleshooting

### Issue: Templates not loading
**Solution:** Check API endpoint and ensure backend is running
```javascript
// Add debug logging
console.log('Fetching templates from:', '/api/enseignant/templates');
```

### Issue: Modal form not validating
**Solution:** Ensure all required fields are checked in validateForm()
```javascript
const validateForm = () => {
  const newErrors = {};
  // Add validation for each field
  return Object.keys(newErrors).length === 0;
};
```

### Issue: Filters not working
**Solution:** Check norm() function for accent removal
```javascript
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
```

### Issue: Styling not applied
**Solution:** Ensure CSS file is imported in component
```javascript
import '../../styles/TemplateSelector.css';
```

## Future Enhancements

1. **Template Preview** - Show full template preview before selection
2. **Favorites** - Star/bookmark frequently used templates
3. **Recent Templates** - Show recently used templates
4. **Template Sharing** - Share templates with other teachers
5. **Custom Templates** - Allow teachers to create custom templates
6. **Template Analytics** - Show usage statistics
7. **Advanced Search** - Full-text search with autocomplete
8. **Bulk Operations** - Select multiple templates for batch operations

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Accessibility

- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ WCAG AA color contrast
- ✅ Form labels associated with inputs
- ✅ Error messages linked to fields
- ✅ Loading states announced to screen readers
- ✅ Modal focus management

## Support

For issues or questions:
1. Check the design.md for detailed specifications
2. Review the component code comments
3. Check browser console for error messages
4. Verify API endpoints are working correctly
