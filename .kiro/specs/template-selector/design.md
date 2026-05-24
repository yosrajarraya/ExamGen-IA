# Template Selector Design Document

## Overview

The **TemplateSelector** component provides a user-friendly interface for teachers to browse, filter, and select exam templates before initiating AI-powered exam generation. It serves as the entry point to the AIGenerator workflow, allowing teachers to choose from predefined exam templates (DEVOIR SURVEILLÉ, Examen Final, etc.) and customize header information before generation begins.

The component integrates seamlessly with the existing ExamBank design system, using the same color palette (navy blue #0e2b50, gold #d4a843), card layouts, and filtering patterns to maintain visual consistency across the application.

## Architecture

### Component Hierarchy

```
TemplateSelector (Main Container)
├── Header Section
│   ├── Title & Subtitle
│   └── "Create New Template" Button (future)
├── Filtering Panel
│   ├── Search Bar
│   ├── Filter Dropdowns (Type, Subject, Level)
│   ├── Active Filter Indicators
│   └── Reset Filters Button
├── Template Cards Grid
│   ├── TemplateCard (repeating)
│   │   ├── Card Header (Status, Type Badge)
│   │   ├── Template Name
│   │   ├── Description
│   │   ├── Metadata (Subject, Level, Question Count, Date)
│   │   ├── Action Buttons (Select, Preview, Delete)
│   │   └── Hover Effects
│   └── Empty State (when no templates match)
├── Pagination Controls
│   ├── Previous Button
│   ├── Page Numbers
│   ├── Next Button
│   └── "Showing X-Y of Z templates"
└── Template Selection Modal
    ├── Template Preview
    ├── Header Information Form
    │   ├── Title Input
    │   ├── Subject/Matière Dropdown
    │   ├── Department Dropdown
    │   ├── Level/Année Dropdown
    │   ├── Duration Input
    │   └── Total Points Input
    ├── Action Buttons (Generate, Cancel)
    └── Form Validation & Error Messages
```

### State Management

```javascript
// Main component state
{
  templates: [],              // All available templates from API
  filteredTemplates: [],      // Templates after applying filters
  currentPage: 1,             // Current pagination page
  itemsPerPage: 9,            // 3 columns × 3 rows
  
  // Filter state
  searchQuery: '',            // Search by name/description
  filterType: '',             // Template type (final, cc, rattrapage)
  filterSubject: '',          // Subject/Matière
  filterLevel: '',            // Level/Année
  
  // Modal state
  selectedTemplate: null,     // Template selected for generation
  showModal: false,           // Modal visibility
  
  // Form state (in modal)
  formData: {
    title: '',
    matiere: '',
    departement: '',
    niveau: '',
    duree: '',
    noteTotale: ''
  },
  
  // UI state
  loading: false,
  error: '',
  success: ''
}
```

### Data Flow

```
1. Component Mount
   ↓
2. Fetch Templates from API (/enseignant/templates)
   ↓
3. Populate templates state
   ↓
4. User Interacts (search, filter, paginate)
   ↓
5. Apply filters → Update filteredTemplates
   ↓
6. User Clicks "Select" on Template Card
   ↓
7. Open Modal with Template Preview
   ↓
8. User Fills Header Information Form
   ↓
9. User Clicks "Generate"
   ↓
10. Navigate to AIGenerator with selectedTemplate + formData
```

## Components and Interfaces

### 1. TemplateSelector (Main Component)

**Props:**
```typescript
interface TemplateSelectorProps {
  onTemplateSelect?: (template: Template, headerInfo: HeaderInfo) => void;
  onCancel?: () => void;
}
```

**Key Methods:**
- `fetchTemplates()` - Load templates from API
- `applyFilters()` - Filter templates based on search/filters
- `handleSelectTemplate(template)` - Open modal with template
- `handleGenerateExam(formData)` - Proceed to AIGenerator
- `handleDeleteTemplate(templateId)` - Delete template (admin only)
- `resetFilters()` - Clear all active filters

### 2. TemplateCard Component

**Props:**
```typescript
interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  onPreview: (template: Template) => void;
  onDelete: (templateId: string) => void;
  isAdmin?: boolean;
}
```

**Features:**
- Hover effects with elevation and accent bar
- Status badge (Active, Inactive)
- Template metadata display
- Action buttons with icons
- Responsive grid layout

### 3. TemplateSelectionModal Component

**Props:**
```typescript
interface TemplateSelectionModalProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (formData: HeaderInfo) => void;
}
```

**Features:**
- Template preview section
- Header information form with validation
- Real-time form state management
- Error/success messaging
- Generate and Cancel buttons

### 4. FilterPanel Component

**Props:**
```typescript
interface FilterPanelProps {
  onSearchChange: (query: string) => void;
  onTypeChange: (type: string) => void;
  onSubjectChange: (subject: string) => void;
  onLevelChange: (level: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}
```

**Features:**
- Search input with clear button
- Type filter dropdown
- Subject filter dropdown
- Level filter dropdown
- Active filter indicators
- Reset button

## Data Models

### Template Model

```typescript
interface Template {
  id: string;                    // MongoDB ObjectId
  nom: string;                   // Template name
  type: 'final' | 'cc' | 'rattrapage';  // Exam type
  matiere: string;               // Subject
  discipline: string;            // Discipline
  niveau?: string;               // Level/Year
  duree: string;                 // Duration (e.g., "1h30")
  semestre: string;              // Semester
  anneeUniversitaire: string;    // Academic year
  titreExamen: string;           // Exam title
  enseignants: string;           // Teachers
  universiteFr: string;          // University name
  institutFr: string;            // Institute name
  departementFr: string;         // Department name
  langue: 'Français' | 'Arabe' | 'Bilingue';
  templateStyle: 'long' | 'court';
  actif: boolean;                // Active status
  examCount: number;             // Number of exams using this template
  createdAt: string;             // Creation date
  updatedAt: string;             // Last update date
  updatedBy: string;             // Last updated by
}
```

### HeaderInfo Model

```typescript
interface HeaderInfo {
  title: string;                 // Exam title
  matiere: string;               // Subject
  departement: string;           // Department
  niveau: string;                // Level/Year
  duree: string;                 // Duration
  noteTotale: string | number;   // Total points
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Template Filtering Preserves Validity

*For any* set of templates and any combination of active filters (search, type, subject, level), all returned templates SHALL match ALL active filter criteria simultaneously.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 2: Pagination Consistency

*For any* filtered template list and any page number, the displayed templates SHALL be exactly the subset of filtered templates for that page, with no duplicates or missing items across pages.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: Search Query Matching

*For any* search query and any template, the template SHALL be included in search results if and only if the query string (case-insensitive, accent-insensitive) appears in the template name, description, subject, or discipline.

**Validates: Requirements 2.1**

### Property 4: Form Validation Completeness

*For any* header information form submission, the system SHALL reject the submission if and only if any required field (title, subject, department, level, duration, total points) is empty or invalid, and SHALL accept the submission only when all required fields contain valid values.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

### Property 5: Modal State Consistency

*For any* template selection action, opening the modal SHALL populate the template preview with the correct template data, and closing the modal SHALL clear the form state and reset to initial values.

**Validates: Requirements 6.1**

### Property 6: Filter Reset Idempotence

*For any* set of active filters, clicking the reset button SHALL clear all filters and return the template list to its unfiltered state, and clicking reset again SHALL have no additional effect.

**Validates: Requirements 2.5**

## Error Handling

### API Errors

**Template Fetch Failure:**
- Display error banner: "Impossible de charger les modèles. Veuillez réessayer."
- Provide retry button
- Log error to console for debugging

**Template Delete Failure:**
- Show error toast: "Impossible de supprimer le modèle."
- Keep template in list
- Allow user to retry

### Form Validation Errors

**Empty Required Fields:**
- Highlight invalid fields with red border
- Display inline error message below field
- Disable Generate button until all fields are valid

**Invalid Input Values:**
- Duration: Must be valid time format (e.g., "1h30", "2h")
- Total Points: Must be positive number
- Show specific error message for each field

### User Feedback

**Success Messages:**
- "Modèle sélectionné avec succès" (template selected)
- "Génération lancée..." (generation started)

**Warning Messages:**
- "Aucun modèle ne correspond à vos critères" (no templates match filters)
- "Suggestion: Essayez de réinitialiser les filtres" (suggest clearing filters)

## Testing Strategy

### Unit Tests

**Filter Logic:**
- Test search query matching (case-insensitive, accent-insensitive)
- Test type filter matching
- Test subject filter matching
- Test level filter matching
- Test combined filter logic (AND operation)

**Pagination:**
- Test page calculation for various list sizes
- Test boundary conditions (first page, last page, empty list)
- Test page number validation

**Form Validation:**
- Test required field validation
- Test input format validation (duration, points)
- Test form state management

**Template Card Rendering:**
- Test card displays all required metadata
- Test action buttons are clickable
- Test hover effects apply correctly

### Integration Tests

**API Integration:**
- Test template fetch from `/enseignant/templates` endpoint
- Test template delete from `/enseignant/templates/:id` endpoint
- Test error handling for failed requests

**Modal Workflow:**
- Test modal opens with correct template data
- Test form submission navigates to AIGenerator
- Test modal close clears form state

**Navigation:**
- Test successful template selection navigates to AIGenerator
- Test cancel button returns to previous page
- Test back button preserves filter state

### Property-Based Tests

**Property 1: Template Filtering Preserves Validity**
- Generate random template lists with varying metadata
- Apply random filter combinations
- Verify all returned templates match ALL active filters

**Property 2: Pagination Consistency**
- Generate random template lists of varying sizes
- Test all possible page numbers
- Verify no duplicates across pages and no missing items

**Property 3: Search Query Matching**
- Generate random templates with random names/descriptions
- Generate random search queries
- Verify search results match query in name, description, subject, or discipline

**Property 4: Form Validation Completeness**
- Generate random form data with various combinations of empty/valid fields
- Verify rejection when any required field is empty
- Verify acceptance only when all fields are valid

**Property 5: Modal State Consistency**
- Generate random templates
- Open modal with each template
- Verify preview shows correct template data
- Close modal and verify form state is cleared

**Property 6: Filter Reset Idempotence**
- Apply random filter combinations
- Click reset button
- Verify all filters are cleared
- Click reset again
- Verify no additional changes occur

## CSS Classes and Styling

### Layout Classes

```css
.ts-container              /* Main container */
.ts-header                 /* Header section */
.ts-header-title           /* Main title */
.ts-header-subtitle        /* Subtitle */
.ts-filters                /* Filter panel */
.ts-cards-grid             /* Template cards grid */
.ts-pagination             /* Pagination controls */
.ts-modal-overlay          /* Modal overlay */
.ts-modal                  /* Modal container */
```

### Card Classes

```css
.ts-card                   /* Template card */
.ts-card:hover             /* Hover state */
.ts-card-header            /* Card header */
.ts-card-title             /* Card title */
.ts-card-description       /* Card description */
.ts-card-metadata          /* Metadata section */
.ts-card-footer            /* Card footer */
.ts-card-actions           /* Action buttons */
```

### Filter Classes

```css
.ts-search-wrap            /* Search input wrapper */
.ts-search                 /* Search input */
.ts-select                 /* Filter dropdown */
.ts-filter-indicator       /* Active filter badge */
.ts-btn-reset              /* Reset filters button */
```

### Modal Classes

```css
.ts-modal-header           /* Modal header */
.ts-modal-preview          /* Template preview */
.ts-modal-form             /* Header info form */
.ts-form-group             /* Form field group */
.ts-form-input             /* Form input */
.ts-form-error             /* Error message */
.ts-modal-footer           /* Modal footer */
.ts-btn-generate           /* Generate button */
.ts-btn-cancel             /* Cancel button */
```

### Color Palette

```css
--ts-navy:         #0e2b50;      /* Primary navy */
--ts-gold:         #d4a843;      /* Accent gold */
--ts-bg:           #f5f7fc;      /* Background */
--ts-card:         #ffffff;      /* Card background */
--ts-border:       rgba(10, 22, 40, 0.08);
--ts-text-primary: #0d1f3c;      /* Primary text */
--ts-text-muted:   #6b7a99;      /* Muted text */
--ts-danger:       #c0334a;      /* Danger red */
--ts-success:      #0d7a55;      /* Success green */
```

## Responsive Design

### Desktop (1200px+)
- 3-column grid layout
- Full filter panel visible
- Modal max-width: 900px

### Tablet (768px - 1199px)
- 2-column grid layout
- Filters may stack vertically
- Modal max-width: 85vw

### Mobile (< 768px)
- 1-column grid layout
- Filters in collapsible panel
- Modal full-width with padding
- Pagination simplified to prev/next only

## Integration Points

### API Endpoints

**Fetch Templates:**
```
GET /enseignant/templates
Response: Template[]
```

**Delete Template:**
```
DELETE /enseignant/templates/:id
Response: { success: boolean, message: string }
```

### Navigation

**To AIGenerator:**
```javascript
navigate('/enseignant/ai-generator', {
  state: {
    selectedTemplate: template,
    headerInfo: formData
  }
});
```

**From AIGenerator:**
- User can return to TemplateSelector to select different template
- Filter state should be preserved if possible

### Sidebar Integration

- Add "Générateur d'Examen" menu item (if not already present)
- TemplateSelector is first step in exam generation workflow
- Breadcrumb: Dashboard → Générateur d'Examen → TemplateSelector

## Future Enhancements

1. **Create New Template Button** - Allow teachers to create custom templates
2. **Template Favorites** - Star/bookmark frequently used templates
3. **Template Preview** - Show full template preview before selection
4. **Template Sharing** - Share templates with other teachers
5. **Template Analytics** - Show usage statistics for each template
6. **Bulk Operations** - Select multiple templates for batch operations
7. **Template Categories** - Organize templates by category/department
8. **Advanced Search** - Full-text search with autocomplete
9. **Template Versioning** - Track template changes over time
10. **Custom Template Fields** - Allow customization of template metadata

## Accessibility Considerations

- All interactive elements have proper ARIA labels
- Keyboard navigation support (Tab, Enter, Escape)
- Color contrast meets WCAG AA standards
- Form labels associated with inputs
- Error messages linked to form fields
- Loading states announced to screen readers
- Modal has proper focus management

## Performance Considerations

- Lazy load template images/previews
- Implement virtual scrolling for large template lists
- Cache template data with appropriate TTL
- Debounce search input (300ms)
- Paginate results (9 per page) to reduce DOM nodes
- Memoize filtered results to prevent unnecessary recalculations
- Use React.memo for TemplateCard components

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Dependencies

- React 18+
- React Router v6+
- React Icons (FiSearch, FiFilter, FiX, FiChevronLeft, FiChevronRight, etc.)
- Axios (for API calls)
- CSS (no external UI library required - custom styling)

## File Structure

```
src/
├── enseignant/
│   ├── ai-generator/
│   │   ├── TemplateSelector.jsx
│   │   ├── TemplateSelector.css
│   │   ├── components/
│   │   │   ├── TemplateCard.jsx
│   │   │   ├── FilterPanel.jsx
│   │   │   ├── TemplateSelectionModal.jsx
│   │   │   └── Pagination.jsx
│   │   └── hooks/
│   │       └── useTemplateFiltering.js
│   └── questions/
│       └── AIGenerator.jsx (existing)
├── api/
│   └── enseignant/
│       └── Enseignant.api.js (add getTemplates, deleteTemplate)
└── styles/
    └── TemplateSelector.css
```

## Notes

- Component should be placed in the AIGenerator workflow before the current chat interface
- Reuse ExamBank styling patterns for consistency
- Consider extracting common filter/pagination logic into shared utilities
- Template data should be cached to reduce API calls
- Consider implementing a "Recently Used Templates" section
- Error handling should be consistent with existing error patterns in the app
