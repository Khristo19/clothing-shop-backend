const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Middlewares
app.use(cors());
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

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/offers', offerRoutes);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
