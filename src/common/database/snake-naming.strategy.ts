import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Converts camelCase entity/property names to snake_case table/column names.
 * Keeps the database layer conventional (Postgres-friendly) while the
 * TypeScript layer stays idiomatic.
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  private snakeCase(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase();
  }

  override tableName(className: string, customName?: string): string {
    return customName ? `${customName}` : this.snakeCase(className);
  }

  override columnName(propertyName: string, customName: string | undefined): string {
    return this.snakeCase(customName ?? propertyName);
  }

  override relationName(propertyName: string): string {
    return this.snakeCase(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.snakeCase(`${relationName}_${referencedColumnName}`);
  }

  override joinTableName(
    firstTableName: string,
    secondTableName: string,
    _firstPropertyName: string,
  ): string {
    return this.snakeCase(`${firstTableName}_${secondTableName}`);
  }

  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return this.snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
