import AIAAService from './AIAAService';

/**
 *
 * @param {Object} servicesManager
 * @param {Object} configuration
 */
export default function init({ servicesManager, configuration }) {
  console.log('Initializing NVIDIA AIAA client');
  servicesManager.registerService(AIAAService, configuration);
}
