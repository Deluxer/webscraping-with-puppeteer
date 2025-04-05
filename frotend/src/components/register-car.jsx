import React, { useState } from 'react';
import { 
    Container, 
    TextField, 
    Button, 
    Paper, 
    Typography, 
    CircularProgress, 
    Box,
    Snackbar,
    Alert
} from '@mui/material';

function CarRegister() {
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [screenshot, setScreenshot] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setScreenshot(null);

        try {
            const response = await fetch('http://localhost:3000/api/post-ad', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ price, description }),
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message);
            }

            setScreenshot(data.screenshot);
        } catch (error) {
            setError(error.message || 'Ocurrió un error al publicar el anuncio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Publicar Anuncio
                </Typography>

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Precio"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        margin="normal"
                        required
                        InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Descripción"
                        multiline
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        margin="normal"
                        required
                    />

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading}
                            startIcon={loading && <CircularProgress size={20} color="inherit" />}
                        >
                            {loading ? 'Publicando...' : 'Publicar'}
                        </Button>
                    </Box>
                </form>

                {screenshot && (
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            ¡Tu anuncio esta casi listo!
                        </Typography>
                        <img 
                            src={screenshot}
                            alt="Screenshot del anuncio"
                            style={{ 
                                width: '100%', 
                                height: 'auto', 
                                borderRadius: 8,
                                border: '1px solid #ddd'
                            }}
                        />
                    </Box>
                )}

                <Snackbar 
                    open={!!error} 
                    autoHideDuration={6000} 
                    onClose={() => setError(null)}
                >
                    <Alert 
                        severity="error" 
                        onClose={() => setError(null)}
                        sx={{ width: '100%' }}
                    >
                        {error}
                    </Alert>
                </Snackbar>
            </Paper>
        </Container>
    );
}

export default CarRegister;