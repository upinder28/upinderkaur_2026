import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ITSM Platform API',
      version: '1.0.0',
      description: 'Enterprise IT Service Management Platform API',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication' },
      { name: 'Tickets', description: 'Ticket management' },
      { name: 'Comments', description: 'Ticket comments' },
      { name: 'Attachments', description: 'Ticket attachments' },
      { name: 'Users', description: 'User management' },
      { name: 'Teams', description: 'Team management' },
      { name: 'Categories', description: 'Ticket categories' },
      { name: 'Approvals', description: 'Service request approvals' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'Dashboard', description: 'Dashboard & reports' },
      { name: 'Audit', description: 'Audit logs' },
    ],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'admin@itsm.com' },
                    password: { type: 'string', example: 'Admin@123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful, returns JWT token' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          responses: { 200: { description: 'Current user info' } },
        },
      },
      '/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Change password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Password updated' } },
        },
      },
      '/tickets': {
        get: {
          tags: ['Tickets'],
          summary: 'Get all tickets (with filters, pagination, sorting)',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['open','assigned','in_progress','waiting_for_user','resolved','closed','reopened','cancelled'] } },
            { name: 'priority', in: 'query', schema: { type: 'string', enum: ['critical','high','medium','low'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'sla_status', in: 'query', schema: { type: 'string', enum: ['on_track','at_risk','breached'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'sort', in: 'query', schema: { type: 'string', default: 'created_at' } },
            { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc','desc'], default: 'desc' } },
          ],
          responses: { 200: { description: 'List of tickets with pagination' } },
        },
        post: {
          tags: ['Tickets'],
          summary: 'Create a new ticket',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description'],
                  properties: {
                    title: { type: 'string', example: 'Laptop not connecting to VPN' },
                    description: { type: 'string', example: 'Cannot connect since this morning' },
                    category_id: { type: 'string' },
                    priority: { type: 'string', enum: ['critical','high','medium','low'], default: 'medium' },
                    assigned_team_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Ticket created' } },
        },
      },
      '/tickets/{id}': {
        get: {
          tags: ['Tickets'],
          summary: 'Get ticket by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Ticket details with SLA status' }, 404: { description: 'Not found' } },
        },
        patch: {
          tags: ['Tickets'],
          summary: 'Update ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Ticket updated' } },
        },
      },
      '/tickets/{id}/assign': {
        post: {
          tags: ['Tickets'],
          summary: 'Assign ticket to agent/team (agent, manager, admin)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent_id: { type: 'string' },
                    team_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Ticket assigned' } },
        },
      },
      '/tickets/{id}/resolve': {
        post: {
          tags: ['Tickets'],
          summary: 'Resolve ticket (agent, manager, admin)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { resolution_notes: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Ticket resolved' } },
        },
      },
      '/tickets/{id}/reopen': {
        post: {
          tags: ['Tickets'],
          summary: 'Reopen a resolved ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Ticket reopened' } },
        },
      },
      '/tickets/{id}/close': {
        post: {
          tags: ['Tickets'],
          summary: 'Close a ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Ticket closed' } },
        },
      },
      '/tickets/{id}/comments': {
        get: {
          tags: ['Comments'],
          summary: 'Get comments for a ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'List of comments (internal hidden from employees)' } },
        },
        post: {
          tags: ['Comments'],
          summary: 'Add comment to ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string' },
                    is_internal: { type: 'boolean', default: false },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Comment added' } },
        },
      },
      '/tickets/{id}/attachments': {
        get: {
          tags: ['Attachments'],
          summary: 'List attachments for a ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'List of attachments' } },
        },
        post: {
          tags: ['Attachments'],
          summary: 'Upload attachment to ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { file: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
          responses: { 201: { description: 'File uploaded' } },
        },
      },
      '/tickets/{id}/attachments/{fileId}/download': {
        get: {
          tags: ['Attachments'],
          summary: 'Download attachment',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'File download' } },
        },
      },
      '/tickets/{id}/history': {
        get: {
          tags: ['Tickets'],
          summary: 'Get ticket change history',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Ticket history' } },
        },
      },
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'Get all users (admin, manager)',
          parameters: [
            { name: 'role', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'List of users' } },
        },
        post: {
          tags: ['Users'],
          summary: 'Create user (admin only)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    password: { type: 'string' },
                    role: { type: 'string', enum: ['employee','agent','manager','admin'] },
                    team_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'User created' } },
        },
      },
      '/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'User details' } },
        },
        patch: {
          tags: ['Users'],
          summary: 'Update user',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: { type: 'string' },
                    team_id: { type: 'string' },
                    is_active: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'User updated' } },
        },
      },
      '/teams': {
        get: {
          tags: ['Teams'],
          summary: 'Get all teams',
          responses: { 200: { description: 'List of teams with member count' } },
        },
        post: {
          tags: ['Teams'],
          summary: 'Create team (admin only)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Team created' } },
        },
      },
      '/teams/{id}': {
        patch: {
          tags: ['Teams'],
          summary: 'Update team (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Team updated' } },
        },
        delete: {
          tags: ['Teams'],
          summary: 'Delete team (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Team deleted' } },
        },
      },
      '/categories': {
        get: {
          tags: ['Categories'],
          summary: 'Get all categories',
          responses: { 200: { description: 'List of categories' } },
        },
        post: {
          tags: ['Categories'],
          summary: 'Create category (admin only)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Category created' } },
        },
      },
      '/approvals': {
        get: {
          tags: ['Approvals'],
          summary: 'Get service requests',
          responses: { 200: { description: 'List of service requests' } },
        },
        post: {
          tags: ['Approvals'],
          summary: 'Create service request',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    ticket_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Request created' } },
        },
      },
      '/approvals/{id}/approve': {
        post: {
          tags: ['Approvals'],
          summary: 'Approve request (manager, admin)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Request approved' } },
        },
      },
      '/approvals/{id}/reject': {
        post: {
          tags: ['Approvals'],
          summary: 'Reject request (manager, admin)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['reason'],
                  properties: { reason: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Request rejected' } },
        },
      },
      '/approvals/{id}/history': {
        get: {
          tags: ['Approvals'],
          summary: 'Get approval history',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Approval history' } },
        },
      },
      '/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'Get notifications for current user',
          responses: { 200: { description: 'List of notifications' } },
        },
      },
      '/notifications/read-all': {
        patch: {
          tags: ['Notifications'],
          summary: 'Mark all notifications as read',
          responses: { 200: { description: 'All marked read' } },
        },
      },
      '/notifications/{id}/read': {
        patch: {
          tags: ['Notifications'],
          summary: 'Mark notification as read',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Marked read' } },
        },
      },
      '/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard data (role-based)',
          responses: { 200: { description: 'Dashboard stats based on user role' } },
        },
      },
      '/dashboard/reports': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get reports with date filter (manager, admin)',
          parameters: [
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'Volume, priority, resolution time charts data' } },
        },
      },
      '/audit-logs': {
        get: {
          tags: ['Audit'],
          summary: 'Get audit logs (admin only)',
          parameters: [
            { name: 'action', in: 'query', schema: { type: 'string' } },
            { name: 'resource', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Paginated audit logs' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
