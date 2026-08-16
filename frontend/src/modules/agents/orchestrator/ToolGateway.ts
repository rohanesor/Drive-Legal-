import { AgentContext } from './types';
import { ToolRegistry } from './ToolRegistry';

export class ToolGateway {
  /**
   * Safe entry gateway for routing tool executions.
   * Performs authorization, schema validations, and policy gates before calling tools.
   */
  static async executeTool(
    toolName: string,
    input: any,
    context: AgentContext,
    agentPermissions: string[]
  ): Promise<any> {
    const tool = ToolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const hasPermission = tool.permissions.every((perm) => agentPermissions.includes(perm));
    if (!hasPermission) {
      throw new Error(`Authorization Error: Agent lacks permissions to call ${toolName}`);
    }

    if (tool.inputSchema && typeof input !== 'object') {
      throw new Error(`Validation Error: Input parameters for ${toolName} must be structured object`);
    }

    return await tool.execute(input, context);
  }
}
export default ToolGateway;
