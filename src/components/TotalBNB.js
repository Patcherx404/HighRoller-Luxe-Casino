import React from 'react';
import { Grid, Typography, Box } from "@mui/material";
import { formatPHP } from "../utils/formatCurrency";

const TotalBNB = ({ tokenAmount, msg }) => {
  if (tokenAmount > 0 && tokenAmount !== "") {
    const cost = Number(tokenAmount);
    return (
      <Grid container justifyContent="center" alignItems="center" gap={1}>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
          {msg}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            bgcolor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #f59e0b',
            borderRadius: 2,
            px: 1.2,
            py: 0.3,
          }}
        >
          <Typography sx={{ color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace' }}>
            {formatPHP(cost)} PHP
          </Typography>
        </Box>
      </Grid>
    );
  }
  return null;
};

export default TotalBNB;