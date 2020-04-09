import { AIAAProbeTool } from './index';
import csTools from 'cornerstone-tools';

/**
 *
 * @param {Object} servicesManager
 * @param {Object} configuration
 */
export default function init({ servicesManager, configuration }) {
  console.info('NVIDIA AIAA - Initializing AIAA services');
  //servicesManager.registerService(AIAAService, configuration);

  console.info('NVIDIA Tool Addition');
  const tools = [AIAAProbeTool];
  tools.forEach(tool => csTools.addTool(tool));
}
