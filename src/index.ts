import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inventoryRoutes from './routes/inventoryRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ERP Backend is healthy' });
});

app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
});
