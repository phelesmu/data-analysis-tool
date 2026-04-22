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

### Timeline Distribution Chart
- **Functionality**: Automatically generates a visual bar chart showing data distribution over time for date columns, with intelligent granularity (daily, weekly, or monthly) based on date range
- **Purpose**: Provides immediate visual insight into temporal patterns, trends, and data density across the timeline
- **Trigger**: Automatic after data with date columns loads
- **Progression**: Data loads → Date columns detected → Timeline buckets calculated → Bar chart renders with color-coded frequency → User hovers for detailed counts → Chart updates when filters applied
- **Success criteria**: Chart displays correctly with appropriate granularity, bars are color-coded by density (high/medium/low), tooltips show exact counts, responds to data filters

### Correlation Analysis
- **Functionality**: Calculates Pearson correlation coefficients between all numeric columns, displays correlation matrix and ranks strongest relationships
- **Purpose**: Reveals statistical relationships between numeric variables, helping users discover patterns and dependencies in their data
- **Trigger**: Automatic calculation after data loads, accessible via Correlation tab
- **Progression**: Data loads → Numeric columns identified → Correlation matrix calculated → Top correlations ranked by strength → User views matrix heatmap and correlation pairs → Correlation values color-coded by strength (strong/moderate/weak) → Tooltips show detailed correlation info
- **Success criteria**: Correlations calculated accurately (-1 to 1 range), matrix displays with color-coded cells (positive=cyan, negative=red), top 10 correlations listed with strength badges, updates when filters applied

### SQL Query Editor
- **Functionality**: Provides SQL interface to query and transform data using SQL syntax (SELECT, WHERE, GROUP BY, aggregations)
- **Purpose**: Enables advanced users to create custom data subsets and calculated columns for deeper analysis
- **Trigger**: User navigates to SQL tab and enters query
- **Progression**: User clicks SQL tab → Enters query using `?` as table reference → Executes query → New result table generated → Result appears in saved results list → Can view/export/delete results
- **Success criteria**: Queries execute correctly, results display as new tables with statistics and charts, example queries help new users, errors show helpful messages

### JOIN Operations
- **Functionality**: Combines multiple saved query result tables using SQL JOIN operations (INNER, LEFT, RIGHT, FULL)
- **Purpose**: Allows users to merge related datasets by matching column values, enabling relational analysis across multiple query results
- **Trigger**: User creates at least 2 query results, then uses JOIN panel in SQL tab
- **Progression**: User selects left table → Selects right table → Chooses join columns from each → Selects JOIN type → Executes JOIN → Combined result table generated → Result saved to query results list → Relationship diagram updates
- **Success criteria**: All JOIN types work correctly, column prefixes prevent name conflicts (L_ and R_), JOIN preview shows operation details, joined results display with full statistics and visualization capabilities, relationship diagram displays the JOIN connection

### Relationship Diagram
- **Functionality**: Generates interactive visual graph showing relationships between query result tables and JOIN operations using D3 force-directed layout
- **Purpose**: Provides visual understanding of table dependencies and JOIN connections, making complex data relationships clear at a glance
- **Trigger**: Automatic rendering after JOIN operations are performed, visible in SQL tab
- **Progression**: JOIN executes → Diagram updates with new nodes and edges → Original tables displayed as white rectangles, JOIN results as purple rectangles → Lines show JOIN connections → User can drag nodes to rearrange layout → Hover for details → Zoom and pan for navigation
- **Success criteria**: Diagram accurately represents table relationships, nodes are draggable for custom layouts, zoom/pan controls work smoothly, color coding distinguishes source tables from JOIN results, connection lines clearly show which tables participate in each JOIN

### Aggregated Bar Charts
- **Functionality**: Generates visual bar charts showing group comparisons from aggregated data, with multi-value support and interactive column selection
- **Purpose**: Provides immediate visual understanding of aggregation results, comparing values across groups with color-coded bars
- **Trigger**: Automatic rendering after Group By operation executes, displayed in Group By tab below the aggregation panel
- **Progression**: User executes Group By → Aggregated data generates → Bar chart renders with category on X-axis → User selects category column for grouping → User toggles one or more value columns for Y-axis → Chart updates with multiple colored bars → Hover shows detailed tooltips → Chart displays first 50 groups if dataset is large
- **Success criteria**: Charts render correctly with proper scaling, support multiple Y-axis values simultaneously, display formatted numbers (K/M notation), tooltips show exact values, X-axis labels rotate for readability, color-coded bars use distinct chart colors, empty/invalid states show helpful messages

## Edge Case Handling

- **Invalid File Format**: Display clear error message "Please upload a valid Excel or CSV file" with supported format list
- **Empty File**: Show message "The uploaded file contains no data" and prompt to upload different file
- **Large Files**: Display loading indicator during parsing, handle files up to reasonable size (5MB limit recommended)
- **Non-Numeric Data**: Only show statistics for numeric columns, handle text columns gracefully in table view
- **Date Columns**: Automatically detect date columns and provide date-specific filtering with calendar picker
- **Malformed Data**: Catch parsing errors and display "Unable to parse file" with suggestion to check file format
- **Missing Headers**: Auto-generate column names (Column A, Column B, etc.) if first row isn't headers
- **Insufficient Numeric Columns**: Display helpful message in Correlation tab when fewer than 2 numeric columns exist
- **Missing Values**: Handle null values in correlation calculations by excluding them from statistical computations
- **JOIN with No Matches**: Display helpful message when JOIN returns no rows, suggesting different join columns or JOIN type
- **Fewer than 2 Query Results**: Show placeholder in JOIN panel explaining at least 2 query results are needed
- **No JOIN Relationships**: Show placeholder in relationship diagram when no JOINs have been performed yet
- **No Aggregated Data for Charts**: Display placeholder in bar chart when no Group By results exist yet
- **Non-Compatible Chart Data**: Show helpful message when aggregated data lacks necessary column types (needs at least 1 category and 1 numeric column)

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
  - Card (shadcn) - For statistics summary panels, chart containers, filter panels, correlation displays, and JOIN configuration
  - Table (shadcn) - For data grid display with sorting capabilities and correlation matrix
  - Button (shadcn) - Primary actions like "Upload File", "Execute Query", "Execute JOIN", and "Export" with hover states
  - Select (shadcn) - For column selection, chart type switching, JOIN table/column selection with smooth dropdowns
  - Tabs (shadcn) - To switch between Table View, Charts, Statistics, Correlation, and SQL panels
  - Badge (shadcn) - To display data types (numeric, text, date), active filter counts, correlation strength labels, and JOIN type indicators
  - ScrollArea (shadcn) - For smooth scrolling through large datasets, correlation lists, and query results
  - Progress (shadcn) - For file upload progress indication
  - Calendar (shadcn) - For date range selection in filters with intuitive date picker
  - Popover (shadcn) - For calendar dropdown in date filters
  - Collapsible (shadcn) - For expandable filter panel
  - Textarea (shadcn) - For SQL query editor with syntax input
  - Label (shadcn) - For form labels in JOIN panel and query editor
  - Alert (shadcn) - For query/JOIN errors and informational messages

- **Customizations**: 
  - Custom file upload dropzone with drag-over state highlighting
  - Custom chart legend with interactive filtering
  - Custom stat cards with number animations on load
  - Empty state illustrations for no-data scenarios
  - Custom correlation matrix heatmap with color-coded cells based on correlation strength
  - Custom JOIN preview panel showing operation details before execution
  - Syntax-highlighted SQL query textarea with monospace font
  - Interactive force-directed graph for relationship diagram with draggable nodes and zoom/pan controls
  - Multi-value bar chart with toggleable columns and formatted axis labels

- **States**: 
  - Buttons: Default (solid primary), hover (slightly lighter with shadow lift), active (pressed down with darker shade), disabled (muted with reduced opacity)
  - File dropzone: Default (dashed border), drag-over (solid accent border with background tint), uploading (progress bar), success (checkmark animation)
  - Table rows: Default, hover (light background), selected (accent background at low opacity)
  - Chart elements: Default, hover (tooltip appears + element highlights), active (element emphasized)

- **Icon Selection**: 
  - UploadSimple (Phosphor) - File upload action
  - Table (Phosphor) - Table view tab
  - ChartBar (Phosphor) - Chart view tab
  - ChartLine (Phosphor) - Line chart option, timeline chart
  - ChartPie (Phosphor) - Pie chart option
  - SortAscending/SortDescending (Phosphor) - Column sorting
  - DownloadSimple (Phosphor) - Export functionality
  - X (Phosphor) - Clear/remove actions
  - Funnel (Phosphor) - Filter panel icon
  - Plus (Phosphor) - Add filter action
  - CalendarBlank (Phosphor) - Date picker trigger, timeline indicators
  - CaretDown (Phosphor) - Collapsible toggle
  - Function (Phosphor) - Statistics tab
  - ArrowsInLineVertical (Phosphor) - Correlation analysis tab and icon
  - Code (Phosphor) - SQL query tab
  - Play (Phosphor) - Execute query/JOIN button
  - ArrowsLeftRight (Phosphor) - JOIN operations icon
  - GitFork (Phosphor) - Relationship diagram icon
  - ChartBar (Phosphor) - Bar chart visualization icon, group comparison charts
  - FunnelSimple (Phosphor) - Group By aggregation icon

- **Spacing**: 
  - Container padding: `p-8` (2rem) for main content areas
  - Card padding: `p-6` (1.5rem) for internal card content
  - Section gaps: `gap-6` (1.5rem) between major sections
  - Element gaps: `gap-4` (1rem) for related elements
  - Tight spacing: `gap-2` (0.5rem) for labels and values

- **Mobile**: 
  - Stack tabs vertically on mobile with full-width buttons
  - Convert table to card-based layout showing key fields per row
  - Charts scale to full width with adjusted aspect ratios for readability
  - Timeline chart adjusts granularity labels to prevent overlap on small screens
  - Upload dropzone reduces padding and font size
  - Statistics cards stack in single column
  - Filter and date range cards stack vertically instead of side-by-side grid
  - Hide less critical table columns, allow horizontal scroll for essential data
  - Correlation matrix becomes horizontally scrollable with sticky column headers
  - Top correlations list displays one per row on mobile for better readability
  - SQL query editor and JOIN panel stack vertically with full-width controls
  - JOIN table selection cards stack vertically on mobile instead of side-by-side
  - Relationship diagram remains interactive on mobile with touch-based zoom/pan and node dragging
  - Bar charts scale to full width with rotated X-axis labels, legend stacks vertically
  - Multi-value toggles in bar chart wrap to multiple rows on narrow screens
