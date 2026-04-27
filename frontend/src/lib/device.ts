export const getDeviceId = (): string => {
  let id = localStorage.getItem("sandboxed:device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sandboxed:device_id", id);
  }
  return id;
};
