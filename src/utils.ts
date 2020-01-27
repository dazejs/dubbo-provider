
export function getServiceId(interfaceName: string, interfaceGroup: string, interfaceVersion: string) {
  return `Service:${interfaceName}#${interfaceGroup}@${interfaceVersion}`;
}