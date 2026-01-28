/**
 * Simple DI Container
 */

import type { ServiceRegistry } from './bootstrap.js';

type ServiceFactory<T> = (registry: Partial<ServiceRegistry>) => T;

export class Container {
  private factories = new Map<keyof ServiceRegistry, ServiceFactory<unknown>>();
  private instances = new Map<keyof ServiceRegistry, unknown>();
  private resolving = new Set<keyof ServiceRegistry>();

  register<K extends keyof ServiceRegistry>(
    name: K,
    factory: ServiceFactory<ServiceRegistry[K]>
  ): void {
    this.factories.set(name, factory as ServiceFactory<unknown>);
  }

  resolve<K extends keyof ServiceRegistry>(name: K): ServiceRegistry[K] {
    if (this.instances.has(name)) {
      return this.instances.get(name) as ServiceRegistry[K];
    }

    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service not registered: ${name}`);
    }

    this.resolving.add(name);

    try {
      const proxy = new Proxy({} as Partial<ServiceRegistry>, {
        get: (_, key: string) => this.resolve(key as keyof ServiceRegistry),
      });

      const instance = factory(proxy) as ServiceRegistry[K];
      this.instances.set(name, instance);
      return instance;
    } finally {
      this.resolving.delete(name);
    }
  }

  reset(): void {
    this.instances.clear();
  }
}
