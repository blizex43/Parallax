export abstract class TagHandler {
	protected abstract tag: string;

	protected give<T extends Instance>(object: T): void {
		object.AddTag(this.tag);
	}

	protected has<T extends Instance>(object: T): boolean {
		return object.HasTag(this.tag);
	}

	protected remove<T extends Instance>(object: T) {
		object.RemoveTag(this.tag);
	}
}
