import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

// Всякий список отдаётся страницами, и размер страницы приходит из запроса.
// Без потолка `?pageSize=1000000` заставляет API собрать и сериализовать всю
// таблицу (плюс добор переводов и файлов по каждой строке) — одна ссылка
// съедает память и процессор сервера. 1000 — самый большой размер, который
// просит сам фронт (полный список избранного на главной и в библиотеке).
export const MAX_PAGE_SIZE = 1000;

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = 20;
}
