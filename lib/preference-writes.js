// Serialize per-account read/merge/write, including remote document-store requests.
export function createPreferenceWrites(){const tails=new Map();return {run(id,work){const task=(tails.get(id)||Promise.resolve()).catch(()=>{}).then(work);tails.set(id,task);return task.finally(()=>{if(tails.get(id)===task)tails.delete(id);});}};}
