const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Middlewares - CORS configuration
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow your Vercel deployments
        if (origin.includes('vercel.app')) {
            return callback(null, true);
        }

        // Allow all other origins (you can restrict this later)
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ✅ Swagger setup BEFORE defining routes
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Clothing Shop API',
            version: '1.0.0',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./routes/*.js'],
};


const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Now define routes AFTER Swagger is set
const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const saleRoutes = require('./routes/sales.routes');
const offerRoutes = require('./routes/offer.routes');
const userRoutes = require('./routes/user.routes');
const reportRoutes = require('./routes/report.routes');
const settingsRoutes = require('./routes/settings.routes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
