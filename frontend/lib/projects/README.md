# Project Management System

This directory contains the project management system for PackagePro.

## Features

### ✅ Project Folders
- **File**: `ProjectFolders.tsx`
- **Features**:
  - Create and organize folders
  - Nested folder structure
  - Folder-based project filtering
  - Folder colors and icons
  - Project count per folder

### ✅ Project Sharing
- **File**: `ProjectSharing.tsx`
- **Features**:
  - Share projects with users
  - Role-based permissions (viewer, editor, admin)
  - Share management
  - Access control
  - Shared project indicators

### ✅ Project Versioning
- **File**: `ProjectVersioning.tsx`
- **Features**:
  - Create project versions
  - Version history
  - Restore previous versions
  - Version naming and descriptions
  - Change logs
  - Current version tracking

### ✅ Project Templates
- **File**: `ProjectTemplates.tsx`
- **Features**:
  - Template library
  - Template categories
  - Template search
  - Create project from template
  - Template ratings
  - Premium templates

### ✅ Project Comments/Feedback
- **File**: `ProjectComments.tsx`
- **Features**:
  - Add comments to projects
  - Feedback and suggestions
  - Comment types (comment, feedback, suggestion)
  - Comment resolution
  - Reply to comments
  - Mentions and attachments

### ✅ Approval Workflows
- **File**: `ApprovalWorkflow.tsx`
- **Features**:
  - Create custom approval workflows
  - Multi-step approval process
  - Approver assignment
  - Step status tracking
  - Approval/rejection with comments
  - Workflow status management
  - Deadline tracking

## Usage

### Create Project

```typescript
import { ProjectService } from "@/lib/projects/project-service"

const projectService = new ProjectService()

const project = await projectService.createProject({
  name: "My Project",
  description: "Project description",
  folderId: "folder-123",
  status: "draft",
})
```

### Share Project

```typescript
await projectService.shareProject(projectId, {
  userId: "user-123",
  role: "editor",
  permissions: ["view", "edit", "comment"],
})
```

### Create Version

```typescript
await projectService.createVersion(projectId, {
  name: "Version 2.0",
  description: "Major update",
  snapshot: designState,
  changeLog: "Updated colors and layout",
})
```

### Add Comment

```typescript
await projectService.addComment(projectId, {
  userId: "user-123",
  userName: "John Doe",
  content: "Great design!",
  type: "feedback",
})
```

### Create Workflow

```typescript
await projectService.createWorkflow(projectId, {
  name: "Client Approval",
  steps: [
    {
      order: 1,
      name: "Design Review",
      approverId: "user-1",
      approverName: "Designer",
      approverEmail: "designer@example.com",
      required: true,
    },
    {
      order: 2,
      name: "Client Approval",
      approverId: "user-2",
      approverName: "Client",
      approverEmail: "client@example.com",
      required: true,
    },
  ],
  currentStepIndex: 0,
  status: "pending",
})
```

## Store

The project store (`project-store.ts`) provides:
- Project state management
- Folder management
- Version tracking
- Share management
- Comment management
- Workflow management
- Filtering and sorting

## API Routes

- `POST /api/projects` - Create project
- `GET /api/projects` - List projects with filters
- `GET /api/projects/[id]` - Get project by ID
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/projects/[id]/share` - Share project
- `GET /api/projects/[id]/shares` - Get project shares
- `DELETE /api/projects/[id]/shares/[shareId]` - Remove share
- `GET /api/projects/[id]/versions` - Get versions
- `POST /api/projects/[id]/versions` - Create version
- `POST /api/projects/[id]/versions/[versionId]/restore` - Restore version
- `POST /api/projects/folders` - Create folder
- `GET /api/projects/folders` - Get folders
- `POST /api/projects/[id]/comments` - Add comment
- `GET /api/projects/[id]/comments` - Get comments
- `PUT /api/projects/[id]/comments/[commentId]` - Update comment
- `DELETE /api/projects/[id]/comments/[commentId]` - Delete comment
- `GET /api/projects/[id]/workflows` - Get workflow
- `POST /api/projects/[id]/workflows` - Create workflow
- `POST /api/projects/[id]/workflows/steps/[stepId]` - Approve/reject step

## Notes

- Projects support multiple visibility levels (private, team, public)
- Sharing supports role-based permissions
- Versioning maintains full project state snapshots
- Comments support different types and can be resolved
- Workflows support multi-step approval with deadlines
- All operations are permission-checked

