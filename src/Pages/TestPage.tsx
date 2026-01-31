// FILE: src/pages/TestPage.tsx
import TestGenerator from '../components/TestGenerator';

export default function TestPage() {
    return (
        <div style={{ padding: '20px' }}>
        <h1>API Test Page</h1>
        <TestGenerator />
        </div>
    );
}
