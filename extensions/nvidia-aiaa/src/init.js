import { DeepgrowProbeTool, DExtr3DProbeTool } from './index';
import csTools from 'cornerstone-tools';

/**
 *
 * @param {Object} servicesManager
 * @param {Object} configuration
 */
export default function init({ servicesManager, configuration }) {
  console.info('NVIDIA AIAA - Initializing AIAA services');
  //servicesManager.registerService(AIAAService, configuration);

  console.info('NVIDIA Tools Addition');
  console.info(DeepgrowProbeTool);
  console.info(DExtr3DProbeTool);

  const tools = [DeepgrowProbeTool, DExtr3DProbeTool];
  tools.forEach(tool => csTools.addTool(tool));
}
