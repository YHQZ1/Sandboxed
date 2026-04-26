export const getDeviceId = (): string => {
  let id = localStorage.getItem("dojo:device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dojo:device_id", id);
  }
  return id;
};
