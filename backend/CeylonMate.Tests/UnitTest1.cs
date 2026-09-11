namespace CeylonMate.Tests;

public class ScaffoldTests
{
    [Fact]
    public void TestProjectLoads()
    {
        Assert.NotNull(typeof(Program));
    }
}
