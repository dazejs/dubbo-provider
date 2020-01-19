
export function getServiceChunkId(interfaceName: string, interfaceGroup: string, interfaceVersion: string) {
  return `Service:${interfaceName}#${interfaceGroup}@${interfaceVersion}`;
}