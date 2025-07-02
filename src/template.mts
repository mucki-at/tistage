import * as utils from "./utils.mts";
import { assertEquals } from "typia";

export type TemplateDefinition =
{
    name: string,
    description: string,
    copyright: string,
    url: string
}

export type TemplateDefinitions =
{
    version: 1,
    default: string,
    definitions: Record<string, TemplateDefinition>
};

export function LoadTemplateDefinitionsAsync(url: string) : Promise<TemplateDefinitions>
{
    return utils.loadJsonAsync(url).then((data) => {
        let ret=assertEquals<TemplateDefinitions>(data);
        return ret;
    });
}

export type Template<T> = Map<string, T>;
export type OnTemplateUpdated<T> = (t:Template<T>)=>void;

export abstract class TemplateLoader<T> {
    abstract handleLoadTemplateAsync(url: string): Promise<Template<T>>;
    abstract handleUpdateComplete(): void;

    #template: Promise<Template<T>> = new Promise<Template<T>>((resolve, _) => {
        resolve(new Map<string, T>());
    });
    LoadTemplate(url: string): void {
        this.#template = this.handleLoadTemplateAsync(url);
        this.#template
            .then((template) => {
                this.#notify(template);
                this.handleUpdateComplete();
            })
            .catch((reason) => {
                console.error("Error loading url:", reason);
                return new Map<string, T>();
            });
    }

    #consumers = new Map<Object, OnTemplateUpdated<T>>();

    addConsumer(c: Object, f: OnTemplateUpdated<T>): void {
        this.#consumers.set(c, f);
        this.#template.then((template) => f.call(c, template));
    }

    removeConsumer(c: Object): void {
        this.#consumers.delete(c);
    }

    oneshot(c: Object, f: OnTemplateUpdated<T>): void {
        this.#template.then((template) => f.call(c, template));
    }

    #notify(template: Template<T>): void {
        this.#consumers.forEach((f, c) => f.call(c, template));
    }
}


