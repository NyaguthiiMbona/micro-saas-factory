
import { ToolEngine } from '../components/ToolEngine';
import { ToolLayout } from '../components/ToolLayout';

export default function HomePage() {
  return (
    <ToolLayout
      title="JSON Formatter"
      description="Format and validate JSON text directly in your browser."
      category="DeveloperApplication"
    >
      <ToolEngine />
    </ToolLayout>
  );
}
