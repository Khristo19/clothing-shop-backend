const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    try {
        const auth = req.headers.authorization;

        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Missing or invalid token' });
        }

        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ Allow both admin and cashier roles
        if (!['admin', 'cashier'].includes(decoded.role)) {
            return res.status(403).json({ message: 'Forbidden: Not authorized' });
        }

        const swaggerData = fs.readFileSync(path.resolve('./swagger.json'), 'utf-8');

        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      const spec = ${swaggerData};
      SwaggerUIBundle({ dom_id: '#swagger-ui', spec });
    </script>
  </body>
</html>
    `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (err) {
        console.error('[SWAGGER AUTH ERROR]', err.message);
        res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};
