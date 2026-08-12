import { Firebase } from "@rbxts/firebase";
import { Fact, Assert, Theory, InlineData } from "@rbxts/runit";
import { RoSQL } from "shared/forks/rosql";
class SQLUtilityTest {
	@Fact
	public defineFirebaseDatabase(): void {
		const firebase = new Firebase("", "");
		const sql = new RoSQL({ database: firebase });
		Assert.equal("firebase", sql.type);
	}

	@Theory
	// @InlineData("CREATE TABLE UserData (id INT AUTO_INCREMENT(2), name STRING, score INT, userid PRIMARY_KEY)")
	// @InlineData("INSERT INTO MyData (name, lastname, version) VALUES ('Testa', 'Testinger', '1.1')")
	@InlineData("INSERT INTO UserData (name, score, userid) VALUES ('user', '200', '2863566')")
	// @InlineData("SELECT * FROM TestStorage")
	// @InlineData("SELECT id FROM TestStorage")
	// @InlineData("ALTER TABLE TestStorage ADD COLUMN version INT")
	// @InlineData("ALTER TABLE TestStorage ADD COLUMN version INT")
	// @InlineData("ALTER TABLE MyData AUTO_INCREMENT = 2")
	// @InlineData("UPDATE TestStorage SET version = '1.11' WHERE id = '57'")
	// @InlineData("DROP TABLE TestStorage")
	// @InlineData("COMMIT TestStorage SuperCustomOnlyCommit")
	// @InlineData("ROLLBACK TestStorage SuperCustomOnlyCommit")
	// @InlineData("SET AUTOCOMMIT TestStorage = ON")
	public async getSelectedData(query: string): Promise<void> {
		const firebase = new Firebase(
			"https://kengandatastore-default-rtdb.firebaseio.com/",
			"fHnTURTFxzpdQJinvidJZJiOCTFZOOOKEtqpLb0B",
		);
		const sql = new RoSQL({ database: firebase });
		print(query);
		const response = await sql.query(query);
		print(response);
		Assert.defined(response);
	}
}

export = SQLUtilityTest;

// Database: "https://kengandatastore-default-rtdb.firebaseio.com/"
// Auth: "fHnTURTFxzpdQJinvidJZJiOCTFZOOOKEtqpLb0B"
