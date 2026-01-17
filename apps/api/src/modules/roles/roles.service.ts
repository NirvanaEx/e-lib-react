import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";

@Injectable()
export class RolesService {
  constructor(private readonly dbService: DatabaseService) {}

  async list() {
    return this.dbService.db("roles").select("id", "name").orderBy("id");
  }
}
