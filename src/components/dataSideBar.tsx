import { Box, Card, CardContent, Stack, Typography, } from "@mui/material";

export default function DataSideBar(): JSX.Element {
    return (
        <Box sx={{ flexGrow: 2 }} >
            <Card sx={{ height: 1 }}>
                <CardContent>
                    <Stack spacing={2}>
                        <Typography variant="h4"> Data entry side bar </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box >)
}