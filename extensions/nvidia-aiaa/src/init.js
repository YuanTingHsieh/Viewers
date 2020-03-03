import AIAAService from './AIAAService';

/**
 *
 * @param {Object} servicesManager
 * @param {Object} configuration
 */
export default function init({ servicesManager, configuration }) {
  console.log('NVIDIA AIAA - Initializing AIAA services');
  servicesManager.registerService(AIAAService, configuration);
}
