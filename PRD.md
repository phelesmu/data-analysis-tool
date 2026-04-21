# Planning Guide

A web-based data analysis tool that enables users to upload Excel or CSV files, visualize data through interactive charts, and perform basic statistical analysis with an intuitive interface.

**Experience Qualities**:
1. **Efficient** - Users should be able to upload, analyze, and visualize data within seconds without technical knowledge
2. **Insightful** - Data should be presented in clear, meaningful ways that reveal patterns and trends immediately
3. **Professional** - The interface should feel polished and trustworthy for business and research use

**Complexity Level**: Light Application (multiple features with basic state)
This is a focused data analysis tool with file upload, data display, visualization, and basic statistics - perfect for a light application scope.

## Essential Features

### File Upload
- **Functionality**: Accepts Excel (.xlsx, .xls) and CSV (.csv) files via drag-and-drop or file picker
- **Purpose**: Provides the primary data input mechanism for the analysis tool
- **Trigger**: User lands on empty state or clicks "Upload New File" button
- **Progression**: Empty state with upload zone → User drags file or clicks to browse → File validates → Data parses → Table view displays → Charts generate
- **Success criteria**: File uploads successfully, data displays in table format, no errors on valid files

### Data Table View
- **Functionality**: Displays uploaded data in a sortable, scrollable table with column headers
- **Purpose**: Allows users to verify their data loaded correctly and inspect individual values
- **Trigger**: Successful file upload
- **Progression**: Data loads → Table renders with headers → User can scroll and sort columns
- **Success criteria**: All data rows and columns display accurately, table is scrollable for large datasets

### Statistical Summary
- **Functionality**: Automatically calculates and displays key statistics for numeric columns (mean, median, min, max, count)
- **Purpose**: Provides quick insights into data distribution without manual calculation
- **Trigger**: Automatic after data loads
- **Progression**: Data parses → Numeric columns identified → Statistics calculate → Summary cards display
- **Success criteria**: Statistics are accurate and update when new files are uploaded

### Data Visualization
- **Functionality**: Generates interactive charts (bar chart, line chart, pie chart) from numeric data
- **Purpose**: Helps users identify trends, patterns, and outliers visually
- **Trigger**: Automatic after data loads, user can switch chart types
- **Progression**: Data loads → Default chart renders → User selects chart type → Chart updates with animation
- **Success criteria**: Charts render correctly, are interactive (hover tooltips), and switch smoothly between types

### Column Selection
- **Functionality**: Allows users to select which columns to visualize and analyze
- **Purpose**: Enables focused analysis on specific data dimensions
- **Trigger**: User clicks column selector dropdown
- **Progression**: User opens dropdown → Available columns list → User selects columns → Charts and stats update
- **Success criteria**: Only selected columns appear in visualizations and statistical summaries

### Data Filtering
- **Functionality**: Allows users to filter data by specific criteria including text matching, numeric ranges, and date ranges
- **Purpose**: Enables users to focus analysis on specific subsets of data based on column values
- **Trigger**: User expands filter panel and adds filter conditions
- **Progression**: User clicks filter panel → Selects column → Chooses operator (equals, contains, between, after, before, etc.) → Inputs value(s) → Filtered data displays → Statistics and charts update
- **Success criteria**: Filters apply correctly to all data types, multiple filters work together (AND logic), active filter count displays, filtered row count updates

## Edge Case Handling

- **Invalid File Format**: Display clear error message "Please upload a valid Excel or CSV file" with supported format list
- **Empty File**: Show message "The uploaded file contains no data" and prompt to upload different file
- **Large Files**: Display loading indicator during parsing, handle files up to reasonable size (5MB limit recommended)
- **Non-Numeric Data**: Only show statistics for numeric columns, handle text columns gracefully in table view
- **Date Columns**: Automatically detect date columns and provide date-specific filtering with calendar picker
- **Malformed Data**: Catch parsing errors and display "Unable to parse file" with suggestion to check file format
- **Missing Headers**: Auto-generate column names (Column A, Column B, etc.) if first row isn't headers

## Design Direction

The design should evoke confidence, clarity, and efficiency - feeling like a professional analytics dashboard with modern, clean aesthetics. It should reduce cognitive load through clear visual hierarchy and make data exploration feel effortless and engaging.

## Color Selection

A professional analytics palette with vibrant accents that make data visualization pop while maintaining readability.

- **Primary Color**: Deep indigo `oklch(0.35 0.15 265)` - Conveys professionalism, trust, and analytical precision
- **Secondary Colors**: 
  - Soft slate background `oklch(0.98 0.005 265)` for subtle contrast
  - Medium gray `oklch(0.65 0.01 265)` for supporting UI elements
- **Accent Color**: Electric cyan `oklch(0.7 0.15 195)` - Draws attention to interactive elements and data points
- **Foreground/Background Pairings**: 
  - Primary (Deep Indigo oklch(0.35 0.15 265)): White text (oklch(0.99 0 0)) - Ratio 9.2:1 ✓
  - Accent (Electric Cyan oklch(0.7 0.15 195)): Dark text (oklch(0.2 0 0)) - Ratio 8.1:1 ✓
  - Background (Soft Slate oklch(0.98 0.005 265)): Dark text (oklch(0.2 0 0)) - Ratio 14.5:1 ✓
  - Muted (Light Gray oklch(0.95 0.01 265)): Medium gray text (oklch(0.5 0.01 265)) - Ratio 6.8:1 ✓

## Font Selection

Typography should balance data clarity with modern sophistication - crisp enough for numbers and charts, refined enough for a professional tool.

- **Primary Font**: Space Grotesk - A geometric sans with technical precision perfect for UI labels, buttons, and headings
- **Data Font**: JetBrains Mono - Monospaced font for table data ensuring column alignment and number readability

- **Typographic Hierarchy**:
  - H1 (Page Title): Space Grotesk Bold/32px/tight letter spacing (-0.02em)
  - H2 (Section Headers): Space Grotesk SemiBold/24px/normal letter spacing
  - H3 (Card Titles): Space Grotesk Medium/18px/normal letter spacing
  - Body (UI Text): Space Grotesk Regular/16px/normal letter spacing/line-height 1.5
  - Table Data: JetBrains Mono Regular/14px/tabular-nums/line-height 1.6
  - Labels: Space Grotesk Medium/14px/slight letter spacing (0.01em)

## Animations

Animations should reinforce data interactions and state changes, creating a sense of responsiveness without distraction. Use smooth, purposeful motion for: file upload success (subtle scale + fade in), chart transitions between types (morphing with easing), table sorting (gentle reordering), and loading states (skeleton shimmer). Keep animations under 300ms for interactions, with chart transitions at 400ms for visual impact.

## Component Selection

- **Components**: 
  - Card (shadcn) - For statistics summary panels, chart containers, and filter panels with subtle shadows
  - Table (shadcn) - For data grid display with sorting capabilities
  - Button (shadcn) - Primary actions like "Upload File" and "Export" with hover states
  - Select (shadcn) - For column selection and chart type switching with smooth dropdowns
  - Tabs (shadcn) - To switch between Table View, Charts, and Statistics panels
  - Badge (shadcn) - To display data types (numeric, text, date) and active filter counts
  - ScrollArea (shadcn) - For smooth scrolling through large datasets
  - Progress (shadcn) - For file upload progress indication
  - Calendar (shadcn) - For date range selection in filters with intuitive date picker
  - Popover (shadcn) - For calendar dropdown in date filters
  - Collapsible (shadcn) - For expandable filter panel

- **Customizations**: 
  - Custom file upload dropzone with drag-over state highlighting
  - Custom chart legend with interactive filtering
  - Custom stat cards with number animations on load
  - Empty state illustrations for no-data scenarios

- **States**: 
  - Buttons: Default (solid primary), hover (slightly lighter with shadow lift), active (pressed down with darker shade), disabled (muted with reduced opacity)
  - File dropzone: Default (dashed border), drag-over (solid accent border with background tint), uploading (progress bar), success (checkmark animation)
  - Table rows: Default, hover (light background), selected (accent background at low opacity)
  - Chart elements: Default, hover (tooltip appears + element highlights), active (element emphasized)

- **Icon Selection**: 
  - UploadSimple (Phosphor) - File upload action
  - Table (Phosphor) - Table view tab
  - ChartBar (Phosphor) - Chart view tab
  - ChartLine (Phosphor) - Line chart option
  - ChartPie (Phosphor) - Pie chart option
  - SortAscending/SortDescending (Phosphor) - Column sorting
  - DownloadSimple (Phosphor) - Export functionality
  - X (Phosphor) - Clear/remove actions
  - Funnel (Phosphor) - Filter panel icon
  - Plus (Phosphor) - Add filter action
  - CalendarBlank (Phosphor) - Date picker trigger
  - CaretDown (Phosphor) - Collapsible toggle

- **Spacing**: 
  - Container padding: `p-8` (2rem) for main content areas
  - Card padding: `p-6` (1.5rem) for internal card content
  - Section gaps: `gap-6` (1.5rem) between major sections
  - Element gaps: `gap-4` (1rem) for related elements
  - Tight spacing: `gap-2` (0.5rem) for labels and values

- **Mobile**: 
  - Stack tabs vertically on mobile with full-width buttons
  - Convert table to card-based layout showing key fields per row
  - Charts scale to full width with adjusted aspect ratios
  - Upload dropzone reduces padding and font size
  - Statistics cards stack in single column
  - Hide less critical table columns, allow horizontal scroll for essential data
