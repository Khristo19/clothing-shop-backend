const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    const filePath = path.resolve('./swagger.json');

    try {
        const swaggerData = fs.readFileSync(filePath, 'utf-8');

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
        console.error('[SWAGGER UI ERROR]', err.message);
        res.status(500).json({ message: 'Failed to load Swagger UI' });
    }
};
