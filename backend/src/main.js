import express from 'express';
import cors from 'cors';
import path from 'path';
import postAdToSeminuevos from './scraping/service.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

app.use('/screenshots', express.static(path.join(process.cwd(), 'screenshots')));

app.post('/api/post-ad', async (req, res) => {
    try {
        const { price, description } = req.body;
        
        if (!price || !description) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                message: 'Price and description are required',
                screenshot: false
            });
        }

        const screenshotPath = await postAdToSeminuevos({ price, description });
        
        const screenshotUrl = `http://localhost:${PORT}/screenshots/${path.basename(screenshotPath)}`;
        
        res.json({
            success: true,
            message: 'Ad posted successfully',
            screenshot: screenshotUrl
        });

    } catch (error) {
        console.error('Error in /api/post-ad:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to post ad',
            screenshot: false
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
