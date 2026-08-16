import { LocalModel } from './types';

export class LocalInferenceRuntime {
  private models: Map<string, LocalModel> = new Map();
  private loadedModels: Set<string> = new Set();
  private memoryBudgetMb = 512;
  private currentMemoryUsageMb = 0;

  registerModel(model: LocalModel): void {
    this.models.set(model.id, model);
  }

  getModel(id: string): LocalModel | undefined {
    return this.models.get(id);
  }

  async loadModel(id: string): Promise<void> {
    const model = this.getModel(id);
    if (!model) throw new Error(`Model not found: ${id}`);

    if (this.currentMemoryUsageMb + model.requirements.minimumMemoryMb > this.memoryBudgetMb) {
      this.evictModels(model.requirements.minimumMemoryMb);
    }

    await model.load();
    this.loadedModels.add(id);
    this.currentMemoryUsageMb += model.requirements.minimumMemoryMb;
  }

  async unloadModel(id: string): Promise<void> {
    const model = this.getModel(id);
    if (model && this.loadedModels.has(id)) {
      await model.unload();
      this.loadedModels.delete(id);
      this.currentMemoryUsageMb -= model.requirements.minimumMemoryMb;
    }
  }

  async runInference(modelId: string, input: any, timeoutMs = 2000): Promise<any> {
    if (!this.loadedModels.has(modelId)) {
      await this.loadModel(modelId);
    }

    const model = this.getModel(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Inference Timeout Exceeded')), timeoutMs)
    );

    return Promise.race([model.infer(input), timeoutPromise]);
  }

  private evictModels(neededMb: number): void {
    for (const loadedId of this.loadedModels) {
      this.unloadModel(loadedId);
      if (this.currentMemoryUsageMb + neededMb <= this.memoryBudgetMb) {
        break;
      }
    }
  }
}
export default LocalInferenceRuntime;
